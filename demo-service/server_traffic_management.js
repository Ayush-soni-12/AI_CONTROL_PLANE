import express from 'express';
import ControlPlaneSDK, { generateTenantId } from "@ayushsoni12/ai-control-plane-sdk";
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Trust proxy to get real IP from X-Forwarded-For header (for testing)
app.set('trust proxy', true);

app.use(express.json());

// Initialize SDK
const controlPlane = new ControlPlaneSDK({
  apiKey: 'acp_2d936ad37aae3cea5635b46db3708d93897c96af' ,// API key from environment
  tenantId: '38359c4fac51d6b5728454c29f769ef6',
  serviceName: process.env.SERVICE_NAME || 'demo-service',
  controlPlaneUrl: process.env.CONTROL_PLANE_URL || 'http://localhost:8000'
});

// Simple in-memory cache and queue
const cache = {};
const queue = [];

// Helper function
function slowDatabaseWork() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ userId: 123, username: 'testuser' });
    }, 600);
  });
}

app.get('/', (req, res) => {
  res.json({ 
    message: 'Demo Service - Traffic Management Examples',
    endpoints: {
      critical: 'POST /payment - Never queued or shed',
      high: 'POST /login - Rarely affected',
      medium: 'GET /products - Queued at 80-120 req/min',
      low: 'GET /analytics - Shed at >120 req/min'
    }
  });
});

// =====================================
// CRITICAL PRIORITY - Never affected
// =====================================
app.post('/payment', 
  controlPlane.middleware('/payment', { priority: 'critical' }),
  async (req, res) => {
    console.log('💳 Payment request (CRITICAL priority)');
    
    // Critical requests are NEVER rate limited, queued, or shed
    // But still check circuit breaker for safety
    if (req.controlPlane.shouldSkip) {
      return res.status(503).json({
        error: 'Service degraded',
        message: 'Payment processing temporarily unavailable'
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    res.json({
      success: true,
      transactionId: 'TXN-' + Date.now(),
      message: 'Payment processed'
    });
  }
);

// =====================================
// HIGH PRIORITY - Protected
// =====================================
app.post('/login', 
  controlPlane.middleware('/login', { priority: 'high' }),
  async (req, res) => {
    console.log('🔐 Login request (HIGH priority)');
    console.log("req.controlPlane", req.controlPlane);
    
    // Check per-customer rate limit
    if (req.controlPlane.isRateLimitedCustomer) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Your IP has exceeded the rate limit (10 req/min)`,
        retry_after: req.controlPlane.retryAfter,
        customer_ip: req.controlPlane.customer_identifier
      });
    }
    
    // Check load shedding (only if >150 req/min for high priority)
    if (req.controlPlane.isLoadShedding) {
      return res.status(503).json({
        error: 'Service overloaded',
        message: 'System is under extreme load. Please retry in a moment.',
        retry_after: req.controlPlane.retryAfter
      });
    }
    
    // Circuit breaker
    if (req.controlPlane.shouldSkip) {
      return res.json({
        success: false,
        message: 'Service in degraded mode',
        token: 'cached-token'
      });
    }
    
    const user = await slowDatabaseWork();
    const token = 'token-' + Date.now();
    
    res.json({
      success: true,
      token: token,
      user: user
    });
  }
);

// =====================================
// MEDIUM PRIORITY - Queued at moderate load
// =====================================
app.get('/products',
  controlPlane.middleware('/products', { priority: 'medium' }),
  async (req, res) => {
    console.log('🛍️ Products request (MEDIUM priority)');
    
    // 1. Check per-customer rate limit FIRST
    if (req.controlPlane.isRateLimitedCustomer) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'You have made too many requests. Please slow down.',
        retry_after: req.controlPlane.retryAfter
      });
    }
    
    // 2. Check load shedding (>150 req/min)
    if (req.controlPlane.isLoadShedding) {
      return res.status(503).json({
        error: 'Service overloaded',
        message: 'Service is dropping non-critical requests. Please retry later.',
        retry_after: req.controlPlane.retryAfter,
        priority_required: req.controlPlane.priorityRequired
      });
    }
    
    // 3. Check queue deferral (80-120 req/min)
    if (req.controlPlane.isQueueDeferral) {
      // USER MANAGES QUEUEING - Custom logic here
      console.log(`⏳ Queueing request for later processing (estimated delay: ${req.controlPlane.estimatedDelay}s)`);
      
      // Add to queue
      queue.push({
        endpoint: '/products',
        timestamp: Date.now(),
        customer: req.controlPlane.customer_identifier
      });
      
      return res.status(202).json({
        message: 'Request queued for processing',
        estimated_delay: req.controlPlane.estimatedDelay,
        queue_position: queue.length,
        reason: req.controlPlane.reason
      });
    }
    
    // 4. Check cache
    if (req.controlPlane.shouldCache && cache.products) {
      console.log('⚡ Cache hit!');
      return res.json({
        cached: true,
        products: cache.products
      });
    }
    
    // 5. Circuit breaker
    if (req.controlPlane.shouldSkip) {
      return res.json({
        circuit_breaker_active: true,
        products: cache.products || []
      });
    }
    
    // Normal processing
    console.log('💾 Fetching from database...');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const products = [
      { id: 1, name: 'Laptop', price: 999 },
      { id: 2, name: 'Mouse', price: 29 }
    ];
    
    if (req.controlPlane.shouldCache) {
      cache.products = products;
    }
    
    res.json({ cached: false, products });
  }
);

// =====================================
// LOW PRIORITY - Shed at moderate load
// =====================================
app.get('/analytics',
  controlPlane.middleware('/analytics', { priority: 'low' }),
  async (req, res) => {
    console.log('📊 Analytics request (LOW priority)');
    
    // 1. Per-customer rate limit
    if (req.controlPlane.isRateLimitedCustomer) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests from your IP',
        retry_after: req.controlPlane.retryAfter
      });
    }
    
    // 2. Load shedding (>120 req/min for low priority!)
    if (req.controlPlane.isLoadShedding) {
      console.log('🗑️  Dropping low-priority analytics request');
      return res.status(503).json({
        error: 'Service overloaded',
        message: 'Analytics are temporarily unavailable. Try again later or use higher priority.',
        retry_after: req.controlPlane.retryAfter,
        priority_required: 'high'
      });
    }
    
    // 3. Queue deferral (80-120 req/min)
    if (req.controlPlane.isQueueDeferral) {
      // Custom queue handling
      const queueItem = {
        endpoint: '/analytics',
        query: req.query,
        timestamp: Date.now()
      };
      
      queue.push(queueItem);
      
      return res.status(202).json({
        message: 'Analytics request queued',
        estimated_delay: req.controlPlane.estimatedDelay,
        queue_id: queue.length - 1
      });
    }
    
    // Normal processing (low load)
    await new Promise(resolve => setTimeout(resolve, 400));
    
    res.json({
      success: true,
      analytics: {
        pageViews: 1234,
        activeUsers: 56,
        timestamp: new Date().toISOString()
      }
    });
  }
);

// =====================================
// QUEUE PROCESSING ENDPOINT
// =====================================
app.get('/queue/status', (req, res) => {
  res.json({
    queue_length: queue.length,
    queued_requests: queue.slice(-5) // Last 5 items
  });
});

// =====================================
// Test endpoint to show all flags
// =====================================
app.get('/debug',
  controlPlane.middleware('/debug', { priority: 'medium' }),
  (req, res) => {
    // Show all available flags to user
    res.json({
      message: 'Traffic Management Debug Info',
      controlPlane: req.controlPlane
    });
  }
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Demo Service running on port ${PORT}`);
  console.log(`📦 Using AI Control Plane SDK`);
  console.log(`\nTraffic Management Endpoints:`);
  console.log(`  🔴 CRITICAL: POST /payment - Never affected`);
  console.log(`  🟠 HIGH: POST /login - Protected, rarely queued/shed`);
  console.log(`  🟡 MEDIUM: GET /products - Queued at 80-120 req/min`);
  console.log(`  🟢 LOW: GET /analytics - Shed at >120 req/min`);
  console.log(`\nUtility:`);
  console.log(`  GET /queue/status - View queue status`);
  console.log(`  GET /debug - See all req.controlPlane flags`);
});
