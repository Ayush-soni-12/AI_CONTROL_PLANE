import express from 'express';
import ControlPlaneSDK from "@ayushsoni12/ai-control-plane";
import dotenv from 'dotenv';

//  openssl rand -hex 16

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Initialize SDK with API key
const controlPlane = new ControlPlaneSDK({
  apiKey: 'your_api_key_here' ,// API key from environment
  tenantId: 'your_tenant_id_here',
  serviceName: process.env.SERVICE_NAME || 'demo-service',
  controlPlaneUrl: process.env.CONTROL_PLANE_URL || 'http://localhost:8000'
});

// Simple in-memory cache
const cache = {};

// Helper functions
function slowDatabaseWork() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ userId: 123, username: 'testuser' });
    }, 600);
  });
}

function getProductsFromDatabase() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([
        { id: 1, name: 'Laptop', price: 999 },
        { id: 2, name: 'Mouse', price: 29 },
        { id: 3, name: 'Keyboard', price: 79 }
      ]);
    }, 800);
  });
}

app.get('/', (req, res) => {
  res.json({ 
    message: 'Demo Service with SDK',
    endpoints: {
      middleware: ['/login', '/products', '/products/:id'],
      manual: ['/checkout', '/search']
    }
  });
});

// =====================================
// MIDDLEWARE APPROACH (Automatic)
// =====================================

app.post('/login', 
  controlPlane.middleware('/login'),
  async (req, res) => {
    console.log('📧 Login request (using middleware)');
    
    if (req.controlPlane.shouldSkip) {
      return res.json({
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

app.get('/products',
  controlPlane.middleware('/products'),
  async (req, res) => {
    console.log('🛍️ Products request (using middleware)');
    
    if (req.controlPlane.shouldCache && cache.products) {
      console.log('⚡ Cache hit!');
      return res.json({
        cached: true,
        products: cache.products
      });
    }
    
    if (req.controlPlane.shouldSkip) {
      return res.json({
        circuit_breaker_active: true,
        products: cache.products || []
      });
    }
    
    console.log('💾 Fetching from database...');
    const products = await getProductsFromDatabase();
    
    if (req.controlPlane.shouldCache) {
      cache.products = products;
      console.log('💾 Cached for future requests');
    }
    
    res.json({
      cached: false,
      products: products
    });
  }
);


// =====================================
// MIDDLEWARE APPROACH (Automatic) with custom endpoint
// =====================================

// Get specific product by ID
app.get('/products/:id',
  // Custom middleware wrapper to track each product separately
  (req, res, next) => {
    const productId = req.params.id;
    const endpoint = `/products/${productId}`;
    console.log(`🔍 [DEBUG] Middleware endpoint: ${endpoint}`);
    // Dynamically create middleware with the actual product ID
    return controlPlane.middleware(endpoint)(req, res, next);
  },
  async (req, res) => {
    const productId = parseInt(req.params.id);
    console.log(`🛍️ Product detail request for ID: ${productId} (using middleware)`);
    
    // Check cache for this specific product
    const cacheKey = `product:${productId}`;
    if (req.controlPlane.shouldCache && cache[cacheKey]) {
      console.log('⚡ Cache hit for product!');
      return res.json({
        cached: true,
        product: cache[cacheKey]
      });
    }
    
    if (req.controlPlane.shouldSkip) {
      return res.json({
        circuit_breaker_active: true,
        product: cache[cacheKey] || null
      });
    }
    
    console.log('💾 Fetching product from database...');
    const products = await getProductsFromDatabase();
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    if (req.controlPlane.shouldCache) {
      cache[cacheKey] = product;
      console.log(`💾 Product ${productId} cached for future requests`);
    }
    
    res.json({
      cached: false,
      product: product
    });
  }
);

// =====================================
// MANUAL TRACKING APPROACH
// =====================================

app.post('/checkout', async (req, res) => {
  console.log('🛒 Checkout request (manual tracking)');
  
  const startTime = Date.now();
  
  // Manual: Get config
  const config = await controlPlane.getConfig('/checkout');
  console.log(`⚙️ Config: cache=${config.cache_enabled}, circuit_breaker=${config.circuit_breaker}`);
  
  // Manual: Check circuit breaker
  if (config.circuit_breaker) {
    console.log('⚠️ Circuit breaker active');
    
    const latency = Date.now() - startTime;
    await controlPlane.track('/checkout', latency, 'success');
    
    return res.json({
      success: false,
      message: 'Checkout temporarily unavailable',
      circuit_breaker_active: true
    });
  }
  
  // Manual: Check cache
  if (config.cache_enabled && cache.checkout) {
    console.log('⚡ Using cached checkout data');
    
    const latency = Date.now() - startTime;
    await controlPlane.track('/checkout', latency, 'success');
    
    return res.json({
      success: true,
      cached: true,
      order: cache.checkout
    });
  }
  
  // Do work
  console.log('💳 Processing checkout...');
  
  try {
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const order = {
      orderId: 'ORD-' + Date.now(),
      total: 1299,
      items: ['Laptop', 'Mouse'],
      status: 'confirmed'
    };
    
    if (config.cache_enabled) {
      cache.checkout = order;
      console.log('💾 Checkout result cached');
    }
    
    const latency = Date.now() - startTime;
    await controlPlane.track('/checkout', latency, 'success');
    
    res.json({
      success: true,
      cached: false,
      order: order
    });
    
  } catch (error) {
    console.error('❌ Checkout failed:', error.message);
    
    const latency = Date.now() - startTime;
    await controlPlane.track('/checkout', latency, 'error');
    
    res.status(500).json({
      success: false,
      error: 'Checkout failed'
    });
  }
});

app.get('/search', async (req, res) => {
  const query = req.query.q || '';
  console.log(`🔍 Search request: "${query}" (manual tracking)`);
  
  const startTime = Date.now();
  
  // Manual: Get config
  const config = await controlPlane.getConfig('/search');
  
  // Manual: Check cache
  const cacheKey = `search:${query}`;
  if (config.cache_enabled && cache[cacheKey]) {
    console.log('⚡ Returning cached search results');
    
    const latency = Date.now() - startTime;
    await controlPlane.track('/search', latency, 'success');
    
    return res.json({
      query: query,
      cached: true,
      results: cache[cacheKey]
    });
  }
  
  // Simulate search
  console.log('🔍 Searching database...');
  await new Promise(resolve => setTimeout(resolve, 650));
  
  const results = [
    { id: 1, title: 'Laptop Pro', price: 999 },
    { id: 2, title: 'Laptop Air', price: 799 }
  ];
  
  if (config.cache_enabled) {
    cache[cacheKey] = results;
    console.log('💾 Search results cached');
  }
  
  const latency = Date.now() - startTime;
  await controlPlane.track('/search', latency, 'success');
  
  res.json({
    query: query,
    cached: false,
    results: results
  });
});

// =====================================
// RATE LIMITING TEST ENDPOINT
// =====================================

app.get('/api/rate-limit',
  controlPlane.middleware('/api/rate-limit'),
  async (req, res) => {
    console.log('🚦 Rate limit test request');
    
    // Check if circuit breaker is active
    if (req.controlPlane.shouldSkip) {
      console.log('🔴 Circuit breaker active');
      return res.json({
        circuit_breaker_active: true,
        message: 'Service degraded - circuit breaker active'
      });
    }
    
    // NEW: Check if rate limiting is active (user-controlled!)
    if (req.controlPlane.shouldRateLimit) {
      console.log(`🚫 Rate limited - retry after ${req.controlPlane.retryAfter}s`);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests - please slow down',
        retry_after: req.controlPlane.retryAfter,
        rate_limited: true
      });
    }
    
    // Simulate some work (fast response)
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const data = {
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Rate limiting test endpoint',
      rate_limit_enabled: req.controlPlane.shouldRateLimit || false
    };
    console.log("data",data)
    
    console.log(`✅ Response sent - Rate limiting: ${req.controlPlane.shouldRateLimit ? 'ENABLED' : 'disabled'}`);
    
    res.json(data);
  }
);

// =====================================
// ERROR TESTING ENDPOINT (for circuit breaker tests)
// =====================================

app.get('/products-error',
  controlPlane.middleware('/products-error'),
  async (req, res) => {
    console.log('⚠️  Products-error request (testing circuit breaker)');
    
    // Check circuit breaker first
    if (req.controlPlane.shouldSkip) {
      console.log('🔴 Circuit breaker active - returning cached data');
      return res.json({
        circuit_breaker_active: true,
        products: cache.products || [],
        message: 'Circuit breaker is active - service degraded'
      });
    }
    // Simulate 60% error rate to trigger circuit breaker
    const shouldFail = Math.random() < 0.6;
    
    if (shouldFail) {
      console.log('❌ Simulating database error');
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        simulated: true
      });
    }
    
    // 40% success rate
    console.log('💾 Fetching from database (success)...');
    const products = await getProductsFromDatabase();
    
    res.json({
      cached: false,
      products: products,
      success: true
    });
  }
);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Demo Service running on port ${PORT}`);
  console.log(`📦 Using AI Control Plane SDK`);
  console.log(`🔑 API Key: ${process.env.CONTROL_PLANE_API_KEY ? '✓ Configured' : '✗ Missing (set CONTROL_PLANE_API_KEY)'}`);
  console.log(`\nEndpoints:`);
  console.log(`  Middleware: POST /login, GET /products, GET /products/:id`);
  console.log(`  Manual: POST /checkout, GET /search?q=laptop`);
});




