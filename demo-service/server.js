const express = require('express');
const ControlPlane = require('ai-control-plane-sdk');

const app = express();
app.use(express.json());

// Initialize SDK
const controlPlane = new ControlPlane({
  serviceName: 'demo-service',
  controlPlaneUrl: 'http://localhost:8000'
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
      middleware: ['/login', '/products'],
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

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Demo Service running on port ${PORT}`);
  console.log(`📦 Using AI Control Plane SDK`);
  console.log(`\nEndpoints:`);
  console.log(`  Middleware: POST /login, GET /products`);
  console.log(`  Manual: POST /checkout, GET /search?q=laptop`);
});