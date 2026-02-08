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
    
    // Warn if API key is not provided
    if (!this.apiKey) {
      console.warn('[ControlPlane] ⚠️  No API key provided. Please initialize the SDK with an API key.');
    }
  }



  /**
   * Send performance signal to control plane
   * 
   * @param {string} endpoint - API endpoint path
   * @param {number} latencyMs - Request latency in milliseconds
   * @param {string} status - 'success' or 'error'
   * @param {string} priority - 'critical', 'high', 'medium', or 'low' (default: 'medium')
   * @param {string} customer_identifier - Optional IP or session ID for per-customer rate limiting
   */
  async track(endpoint, latencyMs, status = 'success', priority = 'medium', customer_identifier = null) {
    try {


      // Prepare headers
      const headers = { 'Content-Type': 'application/json' };
      
      // Add Authorization header if API key is provided
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.controlPlaneUrl}/api/signals`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          service_name: this.serviceName,
          endpoint: endpoint,
          latency_ms: latencyMs,
          status: status,
          tenant_id: this.tenantId,
          priority: priority,  // NEW
          customer_identifier: customer_identifier  // NEW
        }),
        timeout: 1000
      });

      if(response.status === 401){
        console.error('[ControlPlane] Failed to send signal: Invalid API key');
        return {
          reason: 'Invalid API key'
        };
      }

    } catch (error) {
      // Fail silently - don't crash service if control plane is down
      console.error('[ControlPlane] Failed to send signal:', error.message);
    }
  }

  /**
   * Get runtime configuration from control plane with retry logic
   * 
   * @param {string} endpoint - API endpoint path
   * @param {string} priority - Request priority (critical/high/medium/low)
   * @param {string} customer_identifier - Optional IP or session ID
   */
  async getConfig(endpoint, priority = 'medium', customer_identifier = null) {
    // NO CACHING - fetch fresh config every time for real-time traffic management
    // Queue deferral and load shedding require up-to-date traffic metrics
    
    try {
      // Always fetch fresh config from control plane
      const config = await this._fetchConfig(endpoint, priority, customer_identifier);
      return config;
      
    } catch (error) {
      console.error('[ControlPlane] Failed to fetch config:', error.message);
      
      // Return safe defaults if control plane is unavailable
      return {
        cache_enabled: false,
        circuit_breaker: false,
        rate_limited_customer: false,
        queue_deferral: false,
        load_shedding: false,
        status_code: 200,
        reason: 'Control plane unavailable'
      };
    }
  }

  /**
   * Fetch config from control plane
   * @private
   */
  async _fetchConfig(endpoint, priority = 'medium', customer_identifier = null) {
    try {
      // Build URL with tenant_id, priority, and customer_identifier
      let url = `${this.controlPlaneUrl}/api/config/${this.serviceName}${endpoint}`;
      const params = new URLSearchParams();
      
      if (this.tenantId) {
        params.append('tenant_id', this.tenantId);
      }
      if (priority) {
        params.append('priority', priority);
      }
      if (customer_identifier) {
        params.append('customer_identifier', customer_identifier);  // NEW: Pass end-user IP
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      // Prepare headers
      const headers = { 'Content-Type': 'application/json' };
      
      // Add Authorization header if API key is provided
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      console.log(`[ControlPlane] Fetching config from ${url}`);
      
      const response = await fetch(url, { method: 'GET', timeout: 1000, headers: headers });
      const config = await response.json();

      // Handle authentication errors
      if (response.status === 401) {
        console.error('[ControlPlane] Failed to fetch config: Invalid API key');
        return {
          cache_enabled: false,
          circuit_breaker: false,
          rate_limited_customer: false,
          queue_deferral: false,
          load_shedding: false,
          status_code: 200,
          reason: 'Invalid API key'
        };
      }
      
      // Return config as-is
      return config;
      
    } catch (error) {
      console.error(`[ControlPlane] Failed to fetch config:`, error.message);
      throw error;
    }
  }

  /**
   * Express middleware - automatic tracking with traffic management
   * 
   * Provides traffic management information via req.controlPlane for user to handle.
   * Does NOT automatically send error responses - gives user full control.
   * 
   * @param {string} endpoint - API endpoint to track
   * @param {object} options - { priority: 'critical'/'high'/'medium'/'low' }
   */
  middleware(endpoint, options = {}) {
    const sdk = this;
    const priority = options.priority || 'medium';
    
    return async (req, res, next) => {
      const startTime = Date.now();
      
      // Extract customer identifier (IP address) from end-user request
      console.log("req.ip",req.ip);
      const customer_identifier = req.ip || req.connection.remoteAddress;
      console.log(`[ControlPlane] Tracking request for ${customer_identifier}`);
      
      // Get config from control plane with priority AND customer_identifier
      const config = await sdk.getConfig(endpoint, priority, customer_identifier);
      
      const status_code = config.status_code || 200;
      console.log(`[ControlPlane] Received response for ${customer_identifier}: ${status_code}`);
      
      // Attach ALL traffic management info to request
      // User decides how to handle each scenario
      req.controlPlane = {
        // Original config
        config: config,
        
        // Status flags
        isRateLimitedCustomer: config.rate_limited_customer || false,
        isLoadShedding: config.load_shedding || false,
        isQueueDeferral: config.queue_deferral || false,
        
        // Feature flags (existing)
        shouldCache: config.cache_enabled || false,
        shouldSkip: config.circuit_breaker || false,
        
        // Metadata for user to use
        statusCode: status_code,
        retryAfter: config.retry_after || 60,
        estimatedDelay: config.estimated_delay || 10,
        priorityRequired: config.priority_required || 'high',
        reason: config.reason || '',
        
        // Request metadata
        customer_identifier: customer_identifier,
        priority: priority
      };
      
      // Track after response finishes
      res.on('finish', () => {
        const latency = Date.now() - startTime;
        
        // IMPORTANT: Don't track traffic management responses as errors
        // 202 = Queue Deferral (intentional)
        // 429 = Rate Limited (intentional)
        // 503 = Load Shedding (intentional)
        // Only track actual system errors (5xx except 503, and 4xx except 429)
        const isTrafficManagement = [202, 429, 503].includes(res.statusCode);
        const status = (res.statusCode < 400 || isTrafficManagement) ? 'success' : 'error';
        
        sdk.track(endpoint, latency, status, priority, customer_identifier);
      });
      
      next();
    };
  }
}

export default ControlPlaneSDK
export { generateTenantId }