import crypto from 'crypto';

class ControlPlaneSDK {
  constructor(config = {}) {
    this.controlPlaneUrl = config.controlPlaneUrl || 'https://api.neuralcontrol.online';
    this.serviceName     = config.serviceName     || 'unknown-service';
    this.tenantId        = config.tenantId        || null;
    this.apiKey          = config.apiKey          || null;

    // ── Local config cache (the key to zero-latency decisions) ──────────────
    // Structure: { [endpoint]: { cache_enabled, circuit_breaker, ... , fetchedAt } }
    this._configCache    = {};
    this._configTTL      = config.configTTL   || 30_000;   // re-sync every 30s
    this._configTimeout  = config.configTimeout || 2_000;  // give up fetching after 2s

    // ── Signal batching (1 HTTP call per flush, not per request) ────────────
    this._signalQueue    = [];
    this._flushInterval  = config.flushInterval || 5_000;  // flush every 5s
    this._maxQueueSize   = config.maxQueueSize  || 500;    // safety cap
    this._flushTimer     = null;
    this._syncTimers     = {};  // one refresh timer per endpoint

    // ── Distributed Tracing (disabled by default — zero overhead unless enabled) ──
    this._tracingEnabled = config.tracing || false;
    this._spanQueue      = [];  // spans collected per-flush-cycle
    this._activeSpans    = new Map();  // spanId → { name, start, traceId, parentSpanId }

    // ── Local Sliding Window Tracker (For Rate Limiting Edge-Side) ──────────
    this._customerRateLimits = new Map();

    // ── Request Coalescing Tracker ──────────────────────────────────────────
    this._inFlightRequests = new Map();

    // ── Feature Flags ────────────────────────────────────────────────────────
    // Map<flagName, { rolloutPercent, status }> — never queried over the network
    this._flags           = new Map();
    this._flagsEnabled    = config.featureFlags || false;
    this._flagRefreshTimer = null;
    if (this._flagsEnabled) {
      // Load on next tick so constructor completes first
      setImmediate(() => this._loadFlags());
    }

    // ── Safe defaults returned when control plane is unreachable ────────────
    this._safeDefaults = {
      cache_enabled:        false,
      circuit_breaker:      false,
      rate_limited_customer: false,
      queue_deferral:       false,
      load_shedding:        false,
      reason:               'Control plane fetching — using safe defaults',
      // Adaptive Timeout: safe default so SDK always has a usable timeout value
      adaptive_timeout: {
        active:                 false,
        recommended_timeout_ms: 5000,   // 5s fallback — generous but not infinite
        threshold_ms:           2000,
        baseline_p99_ms:        0,
      },
    };

    if (!this.apiKey) {
      console.warn('[ControlPlane] ⚠️  No API key provided. Requests will be unauthenticated.');
    }

    // Start the signal flush loop immediately
    this._startFlushLoop();

    // Periodically clean up old IPs from memory to prevent leaks
    this._memoryCleanupTimer = setInterval(() => {
        this._customerRateLimits.clear();
    }, 3600000); // Clear counter map every 1 hour

    console.log(`[ControlPlane] SDK initialized for service "${this.serviceName}"`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC: initialize(endpoints)
  // Call once at app startup to pre-warm config for known endpoints.
  // ═══════════════════════════════════════════════════════════════════════════

  async initialize(endpoints = []) {
    if (endpoints.length === 0) {
      console.warn('[ControlPlane] initialize() called with no endpoints — nothing to pre-warm.');
      return;
    }

    console.log(`[ControlPlane] Pre-warming config for ${endpoints.length} endpoint(s)...`);

    await Promise.allSettled(
      endpoints.map(ep => this._syncConfig(ep))
    );

    // Start periodic background refresh for each endpoint
    for (const ep of endpoints) {
      this._startSyncLoop(ep);
    }

    console.log(`[ControlPlane] ✅ Config ready. Decisions will be made locally (0ms network overhead).`);
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC: getConfig(endpoint, priority, customer_identifier)
  // NOW: reads from local memory — NO HTTP call — takes < 0.1ms
  // ═══════════════════════════════════════════════════════════════════════════

  getConfig(endpoint, priority = 'medium', customer_identifier = null) {
    const cached = this._configCache[endpoint];

    if (cached) {
      // ✅ Cache hit — return immediately, zero network I/O
      return this._applyCustomerRules(cached, customer_identifier);
    }

    // ⚠️  Cache miss (first time seeing this endpoint) — fetch synchronously
    console.warn(`[ControlPlane] Cache miss for "${endpoint}" — fetching now (first request only)`);
    this._syncConfig(endpoint).then(() => {
      this._startSyncLoop(endpoint);
    });

    return this._safeDefaults;
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE: _generateTraceId() / _generateSpanId()
  // Built-in crypto — no new npm dependencies
  // ═══════════════════════════════════════════════════════════════════════════

  _generateTraceId() {
    return crypto.randomBytes(16).toString('hex');  // 32-char hex, OpenTelemetry-compatible
  }

  _generateSpanId() {
    return crypto.randomBytes(8).toString('hex');   // 16-char hex
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC: track(endpoint, latencyMs, status, priority, customer_identifier, action_taken, trace_id, flagName)
  // NOW: queues signal locally — NO immediate HTTP call
  // ═══════════════════════════════════════════════════════════════════════════

  track(endpoint, latencyMs, status = 'success', priority = 'medium', customer_identifier = null, action_taken = 'none', trace_id = null, flagName = null) {
    if (this._signalQueue.length >= this._maxQueueSize) {
      // Queue is full — drop oldest signal (ring buffer behavior)
      this._signalQueue.shift();
    }

    const signal = {
      service_name:         this.serviceName,
      endpoint,
      latency_ms:           Math.round(latencyMs),
      status,
      tenant_id:            this.tenantId,
      priority,
      customer_identifier,
      action_taken, // Tells the backend if it was rate limited locally!
      recorded_at:          new Date().toISOString(),
    };

    // Include trace_id if tracing is enabled — links signal to span data
    if (this._tracingEnabled && trace_id) {
      signal.trace_id = trace_id;
    }

    // Include flag_name if provided — allows AI to auto-disable the flag on anomaly
    if (flagName) {
      signal.flag_name = flagName;
    }

    this._signalQueue.push(signal);
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC: isEnabled(flagName, userId)
  // Zero-latency evaluation using consistent hashing — reads only from memory.
  // Same user ALWAYS gets the same result for any given rollout percentage.
  // ═══════════════════════════════════════════════════════════════════════════

  isEnabled(flagName, userId) {
    if (!this._flagsEnabled) {
      console.warn('[ControlPlane] isEnabled() called but featureFlags is not enabled in config.');
      return false;
    }

    const flag = this._flags.get(flagName);
    if (!flag) return false;                       // unknown flag → off by default
    if (flag.status === 'disabled') return false;
    if (flag.status === 'auto-disabled') return false;
    if (flag.rollout_percent === 0) return false;
    if (flag.rollout_percent === 100) return true;

    // Consistent hash: MD5(flagName + userId) % 100
    // Same input → same bucket → same user always in/out of rollout
    const hash   = crypto.createHash('md5').update(flagName + String(userId)).digest('hex');
    const bucket = parseInt(hash.slice(0, 4), 16) % 100;
    return bucket < flag.rollout_percent;
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE: _loadFlags() — fetches all flags for this service and starts refresh
  // ═══════════════════════════════════════════════════════════════════════════

  async _loadFlags() {
    try {
      const res = await fetch(
        `${this.controlPlaneUrl}/api/flags/${encodeURIComponent(this.serviceName)}`,
        { headers: { 'Authorization': `Bearer ${this.apiKey}` }, signal: AbortSignal.timeout(3000) }
      );
      if (!res.ok) {
        console.warn(`[ControlPlane] Failed to load flags: ${res.status}`);
        return;
      }
      const { flags } = await res.json();
      for (const f of (flags || [])) {
        this._flags.set(f.name, { rollout_percent: f.rollout_percent, status: f.status });
      }
      console.log(`[ControlPlane] ✅ Loaded ${flags.length} feature flag(s) for "${this.serviceName}"`);
    } catch (err) {
      console.warn('[ControlPlane] Could not load feature flags:', err.message);
    }

    // Periodic refresh every 30s as a safety net (SSE handles instant updates)
    if (!this._flagRefreshTimer) {
      this._flagRefreshTimer = setInterval(() => this._loadFlags(), 30_000);
      this._flagRefreshTimer.unref?.();  // Don't block process exit
    }

    // Open SSE stream for instant updates when AI disables a flag
    this._connectFlagStream();
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE: _connectFlagStream() — SSE stream for instant flag rollout updates
  // ═══════════════════════════════════════════════════════════════════════════

  _connectFlagStream() {
    const url = `${this.controlPlaneUrl}/api/flags/stream/${encodeURIComponent(this.serviceName)}`;
    const headers = { 'Authorization': `Bearer ${this.apiKey}`, 'Accept': 'text/event-stream' };

    const connect = () => {
      fetch(url, { headers })
        .then(res => {
          if (!res.ok) { console.warn('[ControlPlane] Flag SSE connection failed.'); return; }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          const pump = () => reader.read().then(({ done, value }) => {
            if (done) { setTimeout(connect, 5000); return; }  // reconnect on disconnect

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();  // keep any incomplete line

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const flag = JSON.parse(line.slice(6));
                  this._flags.set(flag.name, { rollout_percent: flag.rollout_percent, status: flag.status });
                  console.log(`[ControlPlane] 🔄 Flag updated via SSE: ${flag.name} → ${flag.rollout_percent}% (${flag.status})`);
                } catch {}
              }
            }
            pump();
          }).catch(() => setTimeout(connect, 5000));  // reconnect on error

          pump();
        })
        .catch(() => setTimeout(connect, 5000));  // reconnect backoff
    };

    connect();
  }



  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC: middleware(endpoint, options)
  // Express middleware — adds < 0.1ms overhead
  // ═══════════════════════════════════════════════════════════════════════════

  middleware(endpoint, options = {}) {
    const sdk      = this;
    const priority = options.priority || 'medium';
    const flagName = options.flagName || null;   // NEW: Feature flag telemetry link
    const coalesceEnabled = options.coalesce !== false;

    // Ensure this endpoint is being synced in the background
    if (!this._syncTimers[endpoint]) {
      this._syncConfig(endpoint).then(() => sdk._startSyncLoop(endpoint));
    }

    return (req, res, next) => {
      const startTime = Date.now();

      // Extract customer IP
      const customer_identifier =
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.ip ||
        req.connection?.remoteAddress ||
        null;

      // ✅ Decision from local cache — zero network I/O
      const config = sdk.getConfig(endpoint, priority, customer_identifier);
      const isRateLimited = config.rate_limited_customer || false;

      // Attach everything to req for the route handler
      req.controlPlane = {
        config,
        isRateLimitedCustomer: isRateLimited,
        isLoadShedding:        config.load_shedding         || false,
        isQueueDeferral:       config.queue_deferral        || false,
        shouldCache:           config.cache_enabled         || false,
        shouldSkip:            config.circuit_breaker       || false,
        statusCode:            config.status_code           || 200,
        retryAfter:            config.retry_after           || 60,
        estimatedDelay:        config.estimated_delay       || 10,
        reason:                config.reason                || '',
        customer_identifier,
        priority,
        coalesce: (key, fn) => sdk._coalesce(key, fn),
      };

      // ── Distributed Tracing: generate per-request trace_id + startSpan helper ──
      if (sdk._tracingEnabled) {
        req._traceId    = sdk._generateTraceId();
        req._rootSpanId = sdk._generateSpanId();

        // Track the root span (closed in res.finish below)
        sdk._activeSpans.set(req._rootSpanId, { start: startTime });

        // Expose startSpan() so customers can instrument DB calls, external APIs, etc.
        req.controlPlane.startSpan = (operationName) => {
          const spanId    = sdk._generateSpanId();
          const spanStart = Date.now();
          sdk._activeSpans.set(spanId, { name: operationName, start: spanStart });
          return {
            end: (attributes = {}) => {
              const duration = Date.now() - spanStart;
              sdk._activeSpans.delete(spanId);
              sdk._spanQueue.push({
                trace_id:       req._traceId,  // Tag each span with its trace
                span_id:        spanId,
                parent_span_id: req._rootSpanId,
                operation:      operationName,
                start_time:     new Date(spanStart).toISOString(),
                end_time:       new Date().toISOString(),
                duration_ms:    duration,
                attributes,
              });
            },
          };
        };

        // Expose trace_id so customers can log it or add it to response headers
        req.controlPlane.traceId = req._traceId;
      } else {
        // No-op stubs — zero overhead when tracing disabled
        req.controlPlane.startSpan = () => ({ end: () => {} });
      }

      // Queue signal after response — non-blocking
      res.on('finish', () => {
        const latency = Date.now() - startTime;
        const isTrafficManagement = [202, 429, 503].includes(res.statusCode);
        const status = (res.statusCode < 400 || isTrafficManagement) ? 'success' : 'error';
        const action = isRateLimited ? 'rate_limited' : 'none';

        sdk.track(endpoint, latency, status, priority, customer_identifier, action, req._traceId || null, flagName);

        // Flush spans async if tracing is enabled for this request
        if (sdk._tracingEnabled && req._traceId) {
          console.log(`[DEBUG] res.on('finish') called. trace_id=${req._traceId}, rootSpanId=${req._rootSpanId}`);
          // Close root span
          if (req._rootSpanId && sdk._activeSpans.has(req._rootSpanId)) {
            const root = sdk._activeSpans.get(req._rootSpanId);
            const rootSpan = {
              trace_id:       req._traceId,  // Tag root span with trace
              span_id:        req._rootSpanId,
              parent_span_id: null,
              operation:      `HTTP: ${req.method} ${endpoint}`,
              start_time:     new Date(root.start).toISOString(),
              end_time:       new Date().toISOString(),
              duration_ms:    latency,
              attributes:     { status_code: res.statusCode },
            };
            console.log(`[DEBUG] Pushing root span:`, rootSpan.operation);
            sdk._spanQueue.push(rootSpan);
            sdk._activeSpans.delete(req._rootSpanId);
          } else {
            console.log(`[DEBUG] Root span NOT FOUND in activeSpans!`);
          }
          // Don't wait for flush — same async pattern as signals
        }
      });

      // ✅ [NEW] Automatic Request Coalescing for standard middleware
      if (config.request_coalescing && coalesceEnabled) {
        const coalesceKey = `middleware:${endpoint}:${req.originalUrl || req.url}`;
        
        // Check if there's already an in-flight request for this URL
        if (sdk._inFlightRequests.has(coalesceKey)) {
          console.log(`[ControlPlane] 🤝 Collapsing simultaneous request: ${req.url}`);
          return sdk._inFlightRequests.get(coalesceKey).then(result => {
            if (!res.headersSent) {
              res.status(result.status || 200).json(result.body);
            }
          });
        }

        // Intercept the response to capture the result for future simultaneous callers
        const originalJson = res.json.bind(res);
        const capturePromise = new Promise((resolve) => {
          res.json = (body) => {
            resolve({ status: res.statusCode, body });
            return originalJson(body);
          };
        });

        sdk._inFlightRequests.set(coalesceKey, capturePromise);
        capturePromise.finally(() => sdk._inFlightRequests.delete(coalesceKey));
      }

      next();
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC: withEndpointTimeout(endpoint, handler, options)
  //
  // Wraps an Express route handler with an AI-calculated adaptive timeout.
  // Replaces both middleware() and the raw handler.
  //
  // Usage:
  //   app.get('/products', controlPlane.withEndpointTimeout('/products', async (req, res) => {
  //     // Handler code
  //   }));
  // ═══════════════════════════════════════════════════════════════════════════

  withEndpointTimeout(endpoint, handler, options = {}) {
    const sdk = this;
    const priority = options.priority || 'medium';
    const flagName = options.flagName || null;

    if (!sdk._syncTimers[endpoint]) {
      sdk._syncConfig(endpoint).then(() => sdk._startSyncLoop(endpoint));
    }

    return async (req, res, next) => {
      const startTime = Date.now();

      const customer_identifier =
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.ip ||
        req.connection?.remoteAddress ||
        null;

      const config = sdk.getConfig(endpoint, priority, customer_identifier);
      const isRateLimited = config.rate_limited_customer || false;

      // Attach controlPlane context to req so the handler can still access shouldSkip, etc.
      req.controlPlane = {
        config,
        isRateLimitedCustomer: isRateLimited,
        isLoadShedding:        config.load_shedding         || false,
        isQueueDeferral:       config.queue_deferral        || false,
        shouldCache:           config.cache_enabled         || false,
        shouldSkip:            config.circuit_breaker       || false,
        statusCode:            config.status_code           || 200,
        retryAfter:            config.retry_after           || 60,
        estimatedDelay:        config.estimated_delay       || 10,
        reason:                config.reason                || '',
        customer_identifier,
        priority,
        coalesce: (key, fn) => sdk._coalesce(key, fn),
      };

      const adaptiveTimeout = config.adaptive_timeout || {};
      const timeoutMs = adaptiveTimeout.recommended_timeout_ms || 5000;
      const isActive  = adaptiveTimeout.active || false;
      const coalesceEnabled = options.coalesce !== false;

      if (isActive) {
        console.log(
          `[ControlPlane] ⏱️  Adaptive Timeout ACTIVE for endpoint "${endpoint}" — ` +
          `enforcing ${timeoutMs}ms (latency spike detected)`
        );
      }

      // ── Distributed Tracing: generate per-request trace_id + startSpan helper ──
      if (sdk._tracingEnabled) {
        req._traceId    = sdk._generateTraceId();
        req._rootSpanId = sdk._generateSpanId();

        sdk._activeSpans.set(req._rootSpanId, { start: startTime });

        req.controlPlane.startSpan = (operationName) => {
          const spanId    = sdk._generateSpanId();
          const spanStart = Date.now();
          sdk._activeSpans.set(spanId, { name: operationName, start: spanStart });
          return {
            end: (attributes = {}) => {
              const duration = Date.now() - spanStart;
              sdk._activeSpans.delete(spanId);
              sdk._spanQueue.push({
                trace_id:       req._traceId,
                span_id:        spanId,
                parent_span_id: req._rootSpanId,
                operation:      operationName,
                start_time:     new Date(spanStart).toISOString(),
                end_time:       new Date().toISOString(),
                duration_ms:    duration,
                attributes,
              });
            },
          };
        };

        req.controlPlane.traceId = req._traceId;
      } else {
        req.controlPlane.startSpan = () => ({ end: () => {} });
      }

      // Track upon finish
      res.on('finish', () => {
        const latency = Date.now() - startTime;
        const isTrafficManagement = [202, 429, 503, 504].includes(res.statusCode);
        const status = (res.statusCode < 400 || isTrafficManagement) ? 'success' : 'error';
        const action = isRateLimited ? 'rate_limited' : 'none';
        
        sdk.track(endpoint, latency, status, priority, customer_identifier, action, req._traceId || null, flagName);

        // Flush spans async if tracing is enabled for this request
        if (sdk._tracingEnabled && req._traceId) {
          console.log(`[DEBUG_WITH_TIMEOUT] res.on('finish') called. trace_id=${req._traceId}, rootSpanId=${req._rootSpanId}`);
          if (req._rootSpanId && sdk._activeSpans.has(req._rootSpanId)) {
            const root = sdk._activeSpans.get(req._rootSpanId);
            const rootSpan = {
              trace_id:       req._traceId,
              span_id:        req._rootSpanId,
              parent_span_id: null,
              operation:      `HTTP: ${req.method} ${endpoint}`,
              start_time:     new Date(root.start).toISOString(),
              end_time:       new Date().toISOString(),
              duration_ms:    latency,
              attributes:     { status_code: res.statusCode },
            };
            console.log(`[DEBUG_WITH_TIMEOUT] Pushing root span:`, rootSpan.operation);
            sdk._spanQueue.push(rootSpan);
            sdk._activeSpans.delete(req._rootSpanId);
          } else {
            console.log(`[DEBUG_WITH_TIMEOUT] Root span NOT FOUND in activeSpans!`);
          }
        }
      });

      let timeoutId;

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Endpoint timed out after ${timeoutMs}ms (adaptive timeout)`));
        }, timeoutMs);
      });

      try {
        const executeHandler = async () => {
          return await handler(req, res, next);
        };

        let result;
        if (config.request_coalescing && coalesceEnabled) {
          const coalesceKey = `withEndpointTimeout:${endpoint}:${req.originalUrl || req.url}`;
          result = await sdk._coalesce(coalesceKey, () => Promise.race([
            executeHandler(),
            timeoutPromise
          ]));
        } else {
          result = await Promise.race([
            executeHandler(),
            timeoutPromise
          ]);
        }

        // If the handler returned a value (common in modern patterns), and response not sent yet, send it
        if (result !== undefined && !res.headersSent) {
          res.json(result);
        }
      } catch (error) {
        if (!res.headersSent) {
          const isTimeout = error.message && error.message.includes('timed out') && error.message.includes('adaptive timeout');
          if (isTimeout) {
            console.warn(`[ControlPlane] ⏱️  "${endpoint}" timed out! Terminating response early.`);
            return res.status(504).json({
              success: false,
              error: `Request timed out (AI-enforced ${timeoutMs}ms limit)`,
              tip: 'The AI Control Plane detected a latency spike and aborted the request to protect your server.'
            });
          } else {
             return next(error);
          }
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC: destroy()
  // Clean shutdown
  // ═══════════════════════════════════════════════════════════════════════════

  async destroy() {
    console.log('[ControlPlane] Shutting down — flushing remaining signals...');
    clearInterval(this._flushTimer);
    clearInterval(this._memoryCleanupTimer);
    for (const timer of Object.values(this._syncTimers)) {
      clearInterval(timer);
    }
    await this._flushSignals();
    console.log('[ControlPlane] ✅ Shutdown complete.');
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC: adaptiveFetch(configEndpoint, url, options)
  //
  // Drop-in replacement for fetch() that:
  //   ✅ Enforces the AI-calculated adaptive timeout automatically
  //   ✅ Tracks the latency + success/error signal automatically (no manual track()!)
  //
  // Usage:
  //   // Before (hardcoded timeout + manual tracking)
  //   const start = Date.now();
  //   const res = await fetch('https://payment-api/charge', { ... });
  //   controlPlane.track('/payments/gateway', Date.now() - start, 'success');
  //
  //   // After (one line — timeout + tracking handled automatically)
  //   const res = await controlPlane.adaptiveFetch('/payments/gateway',
  //                 'https://payment-api/charge', { ... });
  // ═══════════════════════════════════════════════════════════════════════════

  async adaptiveFetch(configEndpoint, url, options = {}) {
    const startTime = Date.now();

    // Read AI-calculated timeout from local config cache — 0ms overhead
    const config = this.getConfig(configEndpoint);
    const adaptiveTimeout = config.adaptive_timeout || {};
    const timeoutMs = adaptiveTimeout.recommended_timeout_ms || 5000;
    const isActive  = adaptiveTimeout.active || false;

    if (isActive) {
      console.log(
        `[ControlPlane] ⏱️  Adaptive Timeout ACTIVE for "${configEndpoint}" — ` +
        `enforcing ${timeoutMs}ms (AI-reduced from baseline ${adaptiveTimeout.baseline_p99_ms || '?'}ms p99)`
      );
    }

    // Create AbortController timed by AI recommendation
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });

      // ✅ Auto-track success — no manual controlPlane.track() needed!
      const latency = Date.now() - startTime;
      this.track(configEndpoint, latency, 'success');

      return response;

    } catch (error) {
      // ✅ Auto-track error — no manual controlPlane.track() needed!
      const latency = Date.now() - startTime;
      this.track(configEndpoint, latency, 'error');

      if (error.name === 'AbortError') {
        const msg = isActive
          ? `[ControlPlane] ⏱️  "${configEndpoint}" timed out after ${timeoutMs}ms (Adaptive Timeout active — latency spike detected)`
          : `[ControlPlane] ⏱️  "${configEndpoint}" timed out after ${timeoutMs}ms`;
        console.warn(msg);
        throw new Error(`Request timed out after ${timeoutMs}ms (adaptive timeout)`);
      }
      throw error;

    } finally {
      clearTimeout(timer);
    }
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC: withDbTimeout(configEndpoint, dbQueryFn, priority?)
  //
  // Wraps any database query with the AI-calculated adaptive timeout.
  // Works with ANY promise-based ORM: Prisma, Sequelize, Mongoose, raw pg.
  //
  //   ✅ Enforces AI timeout via Promise.race() — kills slow queries fast
  //   ✅ Tracks the latency + success/error signal automatically (no manual track()!)
  //
  // Usage:
  //   // Before (manual timeout + manual tracking)
  //   const start = Date.now();
  //   const users = await prisma.user.findMany();
  //   controlPlane.track('/db/users', Date.now() - start, 'success');
  //
  //   // After (one line — timeout + tracking handled automatically)
  //   const users = await controlPlane.withDbTimeout('/db/users',
  //                   () => prisma.user.findMany());
  //
  // configEndpoint — your tracking key (must match what you used in initialize())
  // dbQueryFn      — a zero-arg lambda that returns a promise: () => yourOrmCall()
  // priority       — optional: 'critical', 'high', 'medium', 'low' (default: 'medium')
  // ═══════════════════════════════════════════════════════════════════════════

  async withDbTimeout(configEndpoint, dbQueryFn, options = {}) {
    const startTime = Date.now();
    
    // Support legacy signature: withDbTimeout(endpoint, fn, 'high')
    const finalOptions = typeof options === 'string' ? { priority: options } : options;
    const priority = finalOptions.priority || 'medium';

    // Read AI-calculated timeout from local cache — 0ms overhead
    const config = this.getConfig(configEndpoint);
    const adaptiveTimeout = config.adaptive_timeout || {};
    const timeoutMs = adaptiveTimeout.recommended_timeout_ms || 5000;
    const isActive  = adaptiveTimeout.active || false;

    if (isActive) {
      console.log(
        `[ControlPlane] ⏱️  Adaptive Timeout ACTIVE for DB query "${configEndpoint}" — ` +
        `killing slow queries after ${timeoutMs}ms (latency spike detected)`
      );
    }

    // "Timeout bomb" — rejects if DB doesn't respond in timeoutMs
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`DB query timed out after ${timeoutMs}ms (adaptive timeout)`)),
        timeoutMs
      )
    );

    try {
      // Race: DB query vs timeout bomb
      const result = await Promise.race([dbQueryFn(), timeoutPromise]);

      // ✅ Auto-track success — no manual controlPlane.track() needed!
      const latency = Date.now() - startTime;
      this.track(configEndpoint, latency, 'success', priority);

      return result;

    } catch (error) {
      // ✅ Auto-track error — no manual controlPlane.track() needed!
      const latency = Date.now() - startTime;
      this.track(configEndpoint, latency, 'error', priority);

      // Re-throw so the caller can handle it (return 503, show error page, etc.)
      throw error;
    }
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC: getAdaptiveAxiosConfig(configEndpoint, extraConfig)
  //
  // Returns an Axios-compatible config object with the AI-tuned timeout set.
  // NOTE: Axios does not auto-track — call controlPlane.track() after.
  //
  // Usage:
  //   const res = await axios.post(url, data,
  //     controlPlane.getAdaptiveAxiosConfig('/payments/charge'));
  // ═══════════════════════════════════════════════════════════════════════════

  getAdaptiveAxiosConfig(configEndpoint, extraConfig = {}) {
    const config = this.getConfig(configEndpoint);
    const adaptiveTimeout = config.adaptive_timeout || {};
    const timeoutMs = adaptiveTimeout.recommended_timeout_ms || 5000;
    return { ...extraConfig, timeout: timeoutMs };
  }



  /**
   * Apply per-customer overrides to cached config.
   * Runs locally in memory (zero latency!) using a Sliding Window Counter.
   */
  _applyCustomerRules(config, customer_identifier) {
    const clone = { ...config };
    
    // Check if the control plane rule returned a rate limit threshold (e.g. 50 RPM)
    const limitRpm = config.rate_limit_rule_rpm;
    
    // Run sliding window counter logic locally
    if (limitRpm && customer_identifier) {
       clone.rate_limited_customer = this._isCustomerRateLimited(customer_identifier, limitRpm);
       if (clone.rate_limited_customer) {
           clone.reason = 'Customer rate limited locally by edge SDK';
       }
    } else {
       clone.rate_limited_customer = false;
    }
    
    return clone;
  }

  _isCustomerRateLimited(customer_identifier, limit_rpm) {
    const now = Date.now();
    const currentMinuteStr = Math.floor(now / 60000).toString();
    const previousMinuteStr = (Math.floor(now / 60000) - 1).toString();
    
    // Get or initialize the tracker for this IP
    let tracker = this._customerRateLimits.get(customer_identifier);
    if (!tracker) {
      tracker = { currentMinute: currentMinuteStr, currentCount: 0, previousCount: 0 };
      this._customerRateLimits.set(customer_identifier, tracker);
    }

    // Slide the window forward if a new minute started
    if (tracker.currentMinute !== currentMinuteStr) {
      tracker.previousCount = tracker.currentMinute === previousMinuteStr ? tracker.currentCount : 0;
      tracker.currentMinute = currentMinuteStr;
      tracker.currentCount = 0;
    }

    // Add this new request to the current minute
    tracker.currentCount++;

    // Calculate the weighted sliding window score
    const secondsIntoMinute = new Date(now).getSeconds();
    const weightOfPreviousMinute = (60 - secondsIntoMinute) / 60;
    
    const estimatedRpm = Math.floor(
      (tracker.previousCount * weightOfPreviousMinute) + tracker.currentCount
    );

    return estimatedRpm > limit_rpm;
  }

  async _syncConfig(endpoint) {
    const key = `_syncConfig:${endpoint}`;
    return this._coalesce(key, async () => {
      try {
        const url = this._buildConfigUrl(endpoint);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this._configTimeout);

        const response = await fetch(url, {
          method:  'GET',
          headers: this._buildHeaders(),
          signal:  controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
          console.error('[ControlPlane] ❌ Invalid API key — check your configuration');
          return;
        }

        if (!response.ok) return;

        const config = await response.json();

        this._configCache[endpoint] = {
          ...config,
          _fetchedAt: Date.now(),
        };

      } catch (error) {
        // Keep existing cache if available — stale config is better than no config
      }
    });
  }

  /**
   * Internal helper for Request Coalescing (Collapsing).
   * Ensures multiple simultaneous calls for the same key share a single result.
   */
  async _coalesce(key, fetchFn) {
    if (this._inFlightRequests.has(key)) {
      return this._inFlightRequests.get(key);
    }

    const promise = fetchFn().finally(() => {
      this._inFlightRequests.delete(key);
    });

    this._inFlightRequests.set(key, promise);
    return promise;
  }

  _startSyncLoop(endpoint) {
    if (this._syncTimers[endpoint]) return;
    this._syncTimers[endpoint] = setInterval(() => {
      this._syncConfig(endpoint).catch(() => {});
    }, this._configTTL);
  }

  _startFlushLoop() {
    this._flushTimer = setInterval(() => {
      if (this._signalQueue.length > 0) {
        this._flushSignals().catch(() => {});
      }
      // Also flush spans if tracing is enabled and there are spans to send
      if (this._tracingEnabled && this._spanQueue.length > 0) {
        this._flushSpans().catch(() => {});
      }
    }, this._flushInterval);
  }

  async _flushSignals() {
    if (this._signalQueue.length === 0) return;

    // Drain the queue atomically
    const batch = this._signalQueue.splice(0, this._signalQueue.length);
    let requeued = false; // Prevent double-requeueing 

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3_000);

      try {
        const response = await fetch(`${this.controlPlaneUrl}/api/signals/batch`, {
          method:  'POST',
          headers: this._buildHeaders(),
          body:    JSON.stringify({ signals: batch }),
          signal:  controller.signal,
        });

        if (!response.ok && response.status !== 401) {
          console.warn(`[ControlPlane] Batch flush failed (${response.status}) — ${batch.length} signals re-queued`);
          this._signalQueue.unshift(...batch.slice(0, this._maxQueueSize - this._signalQueue.length));
          requeued = true;
        }
      } finally {
        clearTimeout(timeoutId);
      }

    } catch (error) {
      if (error.name !== 'AbortError' && !requeued) {
        this._signalQueue.unshift(...batch.slice(0, this._maxQueueSize - this._signalQueue.length));
      }
    }
  }

  async _flushSpans() {
    if (this._spanQueue.length === 0) return;

    // Drain atomically
    const batch = this._spanQueue.splice(0, this._spanQueue.length);

    // Group spans by trace_id — each unique trace sends one POST
    const byTrace = {};
    for (const span of batch) {
      const tid = span.trace_id || 'unknown';
      if (!byTrace[tid]) byTrace[tid] = [];
      byTrace[tid].push(span);
    }

    for (const [trace_id, spans] of Object.entries(byTrace)) {
      try {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 3_000);

        try {
          const response = await fetch(`${this.controlPlaneUrl}/api/traces/spans`, {
            method:  'POST',
            headers: this._buildHeaders(),
            body:    JSON.stringify({
              trace_id,
              service_name: this.serviceName,
              tenant_id:    this.tenantId,
              spans,
            }),
            signal: controller.signal,
          });

          if (!response.ok && response.status !== 401) {
            // Re-queue on failure (best-effort, cap at 200 total)
            this._spanQueue.unshift(...spans.slice(0, 200 - this._spanQueue.length));
          }
        } finally {
          clearTimeout(timeoutId);
        }

      } catch (error) {
        // Network error — tracing is best-effort, silently discard
      }
    }
  }

  _buildHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
    return headers;
  }

  _buildConfigUrl(endpoint) {
    const params = new URLSearchParams();
    if (this.tenantId) params.append('tenant_id', this.tenantId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return `${this.controlPlaneUrl}/api/config/${this.serviceName}${endpoint}${qs}`;
  }
}

export default ControlPlaneSDK;