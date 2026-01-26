import crypto from 'crypto';

/**
 * Generate a unique tenant ID
 * @param {string} prefix - Optional prefix for the tenant ID (e.g., 'user', 'org', 'customer')
 * @returns {string} Unique tenant identifier
 */
function generateTenantId(prefix = 'tenant') {
  const uuid = crypto.randomUUID();
  return `${prefix}-${uuid}`;
}

class ControlPlaneSDK {
  constructor(config = {}) {
    this.controlPlaneUrl = config.controlPlaneUrl || 'http://localhost:8000';
    this.serviceName = config.serviceName || 'unknown-service';
    this.tenantId = config.tenantId || 'null';
    this.apiKey = config.apiKey || null; // API key for authentication
    this.configCache = {};
    this.configCacheTTL = config.configCacheTTL || 10000; // 10 seconds (was 30s)
    
    // Warn if API key is not provided
    if (!this.apiKey) {
      console.warn('[ControlPlane] ⚠️  No API key provided. Please initialize the SDK with an API key.');
    }
  }

  /**
   * Invalidate cache for a specific endpoint
   * This forces the next getConfig call to fetch fresh data
   */
  invalidateCache(endpoint) {
    const cacheKey = `${this.serviceName}:${endpoint}:${this.tenantId}`;
    if (this.configCache[cacheKey]) {
      console.log(`[ControlPlane] Cache invalidated for ${cacheKey}`);
      delete this.configCache[cacheKey];
    }
  }

  /**
   * Send performance signal to control plane
   */
  async track(endpoint, latencyMs, status = 'success') {
    try {
      // Invalidate cache only on errors
      // Note: We don't invalidate on individual high latency because the control plane
      // makes decisions based on AVERAGE latency across multiple requests (last 10).
      // A single slow request doesn't mean the average is high yet.
      if (status === 'error') {
        console.log(`[ControlPlane] Error detected - invalidating cache`);
        this.invalidateCache(endpoint);
      }

      // Prepare headers
      const headers = { 'Content-Type': 'application/json' };
      
      // Add Authorization header if API key is provided
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      await fetch(`${this.controlPlaneUrl}/api/signals`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          service_name: this.serviceName,
          endpoint: endpoint,
          latency_ms: latencyMs,
          status: status,
          tenant_id: this.tenantId
        }),
        timeout: 1000
      });
    } catch (error) {
      // Fail silently - don't crash service if control plane is down
      console.error('[ControlPlane] Failed to send signal:', error.message);
    }
  }

  /**
   * Get runtime configuration from control plane
   */
  async getConfig(endpoint) {
    // Include tenant_id in cache key for proper multi-tenant isolation
    const cacheKey = `${this.serviceName}:${endpoint}:${this.tenantId}`;
    const cached = this.configCache[cacheKey];
    
    // Return cached config if still fresh
    if (cached && Date.now() - cached.timestamp < this.configCacheTTL) {
      console.log(`[ControlPlane] Using cached config for ${cacheKey}`);
      return cached.config;
    }

    try {
    // Build URL with tenant_id if provided
      let url = `${this.controlPlaneUrl}/api/config/${this.serviceName}${endpoint}`;
      if (this.tenantId) {
        url += `?tenant_id=${this.tenantId}`;
      }
    
      console.log(`[ControlPlane] Fetching fresh config for ${cacheKey}`);
      const response = await fetch(url, { method: 'GET', timeout: 1000 });
      const config = await response.json();
      
      // Cache it with tenant-aware key
      this.configCache[cacheKey] = {
        config: config,
        timestamp: Date.now()
      };
      
      return config;
      
    } catch (error) {
      console.error('[ControlPlane] Failed to fetch config:', error.message);
      
      // Return safe defaults if control plane is unavailable
      return {
        cache_enabled: false,
        circuit_breaker: false,
        reason: 'Control plane unavailable'
      };
    }
  }

  /**
   * Express middleware - automatic tracking
   */
  middleware(endpoint) {
    const sdk = this;
    
    return async (req, res, next) => {
      const startTime = Date.now();
      
      // Get config from control plane
      const config = await sdk.getConfig(endpoint);
      
      // Attach config to request object
      req.controlPlane = {
        config: config,
        shouldCache: config.cache_enabled,
        shouldSkip: config.circuit_breaker
      };
      
      // Track after response finishes
      res.on('finish', () => {
        const latency = Date.now() - startTime;
        const status = res.statusCode < 400 ? 'success' : 'error';
        sdk.track(endpoint, latency, status);
      });
      
      next();
    };
  }
}

export default ControlPlaneSDK
export { generateTenantId }