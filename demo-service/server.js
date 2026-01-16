import express from "express";
const app = express();

// Middleware to parse JSON
app.use(express.json());

// Simple home route
app.get('/', (req, res) => {
  res.json({ message: 'Demo Service is running!' });
});


// Simple in-memory cache
const cache = {};

// Simulate slow database call
function slowDatabaseWork() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ userId: 123, username: 'testuser' });
    }, 600); // 600ms delay
  });
}

// Simulate slow product fetch
function getProductsFromDatabase() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, name: 'Laptop', price: 999 },
        { id: 2, name: 'Mouse', price: 29 },
        { id: 3, name: 'Keyboard', price: 79 },
        { id: 4, name: 'Monitor', price: 299 },
        { id: 5, name: 'Headphones', price: 149 }
      ]);
    }, 800); // 800ms delay (slow database)
  });
}


// Function to send signal to control plane
async function sendSignalToControlPlane(endpoint, latency, status) {
  try {
    const response = await fetch('http://localhost:8000/api/signals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_name: 'demo-service',
        endpoint: endpoint,
        latency_ms: latency,
        status: status
      })
    });
    
    const data = await response.json();
    console.log(`📤 Signal sent: ${endpoint} ${latency}ms - ${data.status}`);
    
  } catch (error) {
    // Don't crash if control plane is down
    console.log('⚠️  Control plane unavailable:', error.message);
  }
}

// Function to get configuration from control plane
async function getConfigFromControlPlane(endpoint) {
  try {
    const response = await fetch(
      `http://localhost:8000/api/config/demo-service${endpoint}`,
      { method: 'GET' }
    );
    
    const config = await response.json();
    console.log(`⚙️  Config received: cache=${config.cache_enabled} (${config.reason})`);
    
    return config;
    
  } catch (error) {
    console.log('⚠️  Control plane unavailable, using defaults');
    // Return safe defaults if control plane is down
    return {
      cache_enabled: false,
      reason: 'Control plane unavailable'
    };
  }
}




// Login endpoint
// Better approach - cache system config
app.post('/login', async (req, res) => {
  console.log('📧 Login request received');
  const startTime = Date.now();
  
  const config = await getConfigFromControlPlane('/login');
  
  // Cache system configuration (SAFE!)
  let systemConfig;
  if (config.cache_enabled && cache['system_config']) {
    console.log('⚡ Using cached system config');
    systemConfig = cache['system_config'];
  } else {
    console.log('💾 Fetching system config from DB...');
    // Simulate fetching system config (slow)
    await new Promise(resolve => setTimeout(resolve, 300));
    systemConfig = {
      passwordMinLength: 8,
      allowedDomains: ['example.com', 'test.com'],
      sessionTimeout: 3600
    };
    
    if (config.cache_enabled) {
      cache['system_config'] = systemConfig;
      console.log('💾 System config cached');
    }
  }
  
  // Validate against system config
  const { email, password } = req.body;
  const domain = email.split('@')[1];
  
  if (!systemConfig.allowedDomains.includes(domain)) {
    return res.status(400).json({ error: 'Domain not allowed' });
  }
  
  // User authentication (NEVER cached - always fresh!)
  console.log('🔐 Authenticating user (not cached)...');
  const user = await slowDatabaseWork();
  
  // Generate unique token (NEVER cached!)
  const token = 'unique-token-' + Date.now() + '-' + Math.random();
  
  const latency = Date.now() - startTime;
  await sendSignalToControlPlane('/login', latency, 'success');
  
  res.json({
    success: true,
    token: token,  // Unique per user
    user: user
  });
});



// Products endpoint - PERFECT for caching!
app.get('/products', async (req, res) => {
  console.log('🛍️  Products request received');
  
  const startTime = Date.now();
  
  // Get config from control plane
  const config = await getConfigFromControlPlane('/products');
  
  // Check cache if enabled
  if (config.cache_enabled && cache['/products']) {
    console.log('⚡ CACHE HIT - Returning cached products!');
    
    const latency = Date.now() - startTime;
    await sendSignalToControlPlane('/products', latency, 'success');
    
    return res.json({
      cached: true,
      products: cache['/products']
    });
  }
  
  // Cache miss - fetch from database
  console.log('💾 CACHE MISS - Fetching products from database...');
  const products = await getProductsFromDatabase();
  
  // Store in cache if enabled
  if (config.cache_enabled) {
    cache['/products'] = products;
    console.log('💾 Products cached for future requests');
  }
  
  const latency = Date.now() - startTime;
  console.log(`⏱️  Request took ${latency}ms`);
  await sendSignalToControlPlane('/products', latency, 'success');
  
  res.json({
    cached: false,
    products: products
  });
});




// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Demo Service running on http://localhost:${PORT}`);
});

