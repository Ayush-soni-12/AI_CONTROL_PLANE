
class ControlPlaneSDK {
  constructor(config = {}) {
    this.controlPlaneUrl = config.controlPlaneUrl || 'http://localhost:8000';
    this.serviceName = config.serviceName || 'unknown-service';
    this.configCache = {};
    this.configCacheTTL = config.configCacheTTL || 30000; // 30 seconds
  }

  /**
   * Send performance signal to control plane
   */
  async track(endpoint, latencyMs, status = 'success') {
    try {
      await fetch(`${this.controlPlaneUrl}/api/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_name: this.serviceName,
          endpoint: endpoint,
          latency_ms: latencyMs,
          status: status
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
    const cacheKey = `${this.serviceName}:${endpoint}`;
    const cached = this.configCache[cacheKey];
    
    // Return cached config if still fresh
    if (cached && Date.now() - cached.timestamp < this.configCacheTTL) {
      return cached.config;
    }

    try {
      const response = await fetch(
        `${this.controlPlaneUrl}/api/config/${this.serviceName}${endpoint}`,
        { method: 'GET', timeout: 1000 }
      );
      
      const config = await response.json();
      
      // Cache it
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