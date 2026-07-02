import express from 'express';
import ControlPlaneSDK from "neuralcontrol";
import axios from 'axios';
import dotenv from 'dotenv';
import paymentsLite from 'neuralcontrol-payments-lite';
const { verifyOnChain, getAgentScore } = paymentsLite;
//  openssl rand -hex 16

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Initialize SDK with API key
const controlPlane = new ControlPlaneSDK({
  apiKey: 'acp_f7463837dc567446d8059e44956cf4895072d2a9' ,// API key from environment
  tenantId: 'bfc3aed7948e46fafacac26faf8b3158',
  serviceName: process.env.SERVICE_NAME || 'hi-service',
  controlPlaneUrl: process.env.CONTROL_PLANE_URL || 'http://localhost:8000',
  tracing: true, // Enable distributed tracing for the demo
  featureFlags: true // Enable real-time feature flags
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
      middleware: ['/login', '/products', '/beta-feature'],
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
  controlPlane.withEndpointTimeout('/products', async (req, res) => {
    console.log('🛍️ Products request (using endpoint wrapper)');

    const simulatedDelay = parseInt(req.query.delay) || 0;
    if (simulatedDelay > 0) {
      console.log(`⏳ Simulating endpoint delay of ${simulatedDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, simulatedDelay));
    }

    if (req.controlPlane.isRateLimitedCustomer) {
       console.log("Rate limit exceeded")
    }
    
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

    if (req.controlPlane.shouldRateLimit) {
       console.log("Rate limit exceeded")
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
  })
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

// =====================================
// DISTRIBUTED TRACING DEMO
// =====================================

app.post('/checkout-trace', controlPlane.middleware('/checkout-trace'), async (req, res) => {
  console.log('🛒 Checkout request (with distributed tracing)');
  
  // 1. Trace a simulated database call
  const dbSpan = req.controlPlane.startSpan("DB: Verify Inventory");
  // Simulate slow database resolving
  await new Promise(resolve => setTimeout(resolve, 350));
  dbSpan.end({ items_checked: 2, stock_available: true });

  // 2. Trace a simulated external payment provider
  const stripeSpan = req.controlPlane.startSpan("Stripe: Process Payment");
  // Simulate payment processing delay (might be fast or slow)
  const isSlow = Math.random() > 0.5;
  await new Promise(resolve => setTimeout(resolve, isSlow ? 850 : 200));
  stripeSpan.end({ status: "success", provider: "stripe", slow_simulated: isSlow });

  // 3. Trace a fast cache write
  const cacheSpan = req.controlPlane.startSpan("Redis: Cache Order");
  await new Promise(resolve => setTimeout(resolve, 15));
  cacheSpan.end({ bytes_written: 1024 });

  res.json({
    success: true,
    message: "Checkout complete with tracing!",
    traceId: req.controlPlane.traceId, // Useful for linking to your frontend
    timing: { db: 350, payment: isSlow ? 850 : 200, cache: 15 }
  });
});

app.get('/user-profile-trace', controlPlane.middleware('/user-profile-trace'), async (req, res) => {
  console.log('👤 User profile request (with distributed tracing and attributes)');
  
  // 1. Trace a database query to get the user
  const userQuerySpan = req.controlPlane.startSpan("Postgres: SELECT User");
  await new Promise(resolve => setTimeout(resolve, 15)); // Simulate 120ms db query
  
  // The object passed to .end() is NOT random! 
  // These are "Attributes" (metadata) that you want the AI to see. 
  // You decide exactly what key/values go here.
  userQuerySpan.end({ 
    query_type: "SELECT", 
    table: "users", 
    user_id: 8472,
    cache_hit: false 
  });

  // 2. Trace an external API call to fetch their recent orders
  const ordersApiSpan = req.controlPlane.startSpan("ExternalService: Fetch Orders");
  await new Promise(resolve => setTimeout(resolve, 45)); // Simulate slow 400ms external API
  
  ordersApiSpan.end({
    api_endpoint: "api.orders.example.com",
    orders_returned: 5,
    status_code: 200
  });

  // 3. Trace an internal calculation (e.g. generating recommendations)
  const computeSpan = req.controlPlane.startSpan("CPU: Compute Recommendations");
  await new Promise(resolve => setTimeout(resolve, 10)); // Simulate heavy CPU work
  
  // You don't HAVE to pass attributes. Doing so is completely optional.
  computeSpan.end();

  res.json({
    success: true,
    user: "John Doe",
    orders: 5,
    traceId: req.controlPlane.traceId
  });
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


// =====================================
// ADAPTIVE TIMEOUT DEMO — DATABASE CALLS
// =====================================
//
// WHAT THIS DEMONSTRATES:
// For DB calls (Postgres, MySQL, Mongo, Redis), use controlPlane.withDbTimeout().
// It works exactly like middleware() for inbound requests — fully automatic:
//   ✅ Enforces AI timeout — kills slow queries to protect the connection pool
//   ✅ Tracks latency + success/error automatically — no manual track() needed!
//
// HOW TO TEST IT:
//   Fast DB:    GET /users?delay=100   → succeeds, auto-tracked as success
//   Slow DB:    GET /users?delay=8000  → killed by AI timeout, auto-tracked as error
//   Compare: Without this, a slow query holds your entire DB connection pool!

app.get('/users', async (req, res) => {
  const simulatedDbDelay = parseInt(req.query.delay) || 100;
  console.log(`\n👤 [/users] Fetching user list | simulated DB delay: ${simulatedDbDelay}ms`);

  // Peek at the config so we can show the user what timeout is being enforced
  const config = controlPlane.getConfig('/db/users');
  const adaptiveTimeout = config.adaptive_timeout || {};

  console.log(`⏱️  [/users] AI Adaptive Timeout: ${adaptiveTimeout.recommended_timeout_ms}ms (active: ${adaptiveTimeout.active})`);

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // ONE LINE. That's it.
    //
    // controlPlane.withDbTimeout() handles everything automatically:
    //   1. Reads the AI-calculated timeout from local cache (0ms cost)
    //   2. Runs your DB query and times it
    //   3. If the DB is slow → kills the query at the AI-recommended timeout
    //   4. Tracks the latency + status automatically (just like middleware!)
    //
    // In your real app, swap the lambda with your actual ORM call:
    //   Prisma:    () => prisma.user.findMany()
    //   Sequelize: () => User.findAll()
    //   Mongoose:  () => User.find()
    //   Raw pg:    () => pool.query('SELECT * FROM users')
    // ──────────────────────────────────────────────────────────────────────────
    const users = await controlPlane.withDbTimeout(
      '/db/users',                             // tracking key (matches initialize())
      () => new Promise(resolve =>             // ← swap with your real ORM call!
        setTimeout(() => resolve([
          { id: 1, name: 'Alice',   email: 'alice@example.com'   },
          { id: 2, name: 'Bob',     email: 'bob@example.com'     },
          { id: 3, name: 'Charlie', email: 'charlie@example.com' },
        ]), simulatedDbDelay)
      )
      // ✅ Tracking happens automatically — no controlPlane.track() needed here!
    );

    console.log(`✅ [/users] DB responded. Returning ${users.length} users.`);

    return res.json({
      success: true,
      users,
      adaptive_timeout_was_active: adaptiveTimeout.active,
      timeout_enforced_ms: adaptiveTimeout.recommended_timeout_ms,
    });

  } catch (error) {
    // DB timed out or errored. Tracking already happened automatically inside withDbTimeout().
    const isTimeout = error.message.includes('timed out');
    console.error(`❌ [/users] ${isTimeout ? 'DB query timed out' : 'DB error'}: ${error.message}`);

    return res.status(503).json({
      success: false,
      error: isTimeout
        ? `DB query timed out (AI-enforced ${adaptiveTimeout.recommended_timeout_ms}ms, not the default 30s)`
        : `DB error: ${error.message}`,
      tip: 'Adaptive Timeout killed the slow query to protect the connection pool.',
    });
  }
});




// =====================================
// ADAPTIVE TIMEOUT DEMO — AXIOS (Manual tracking required)
// =====================================
//
// WHAT THIS DEMONSTRATES:
// getAdaptiveAxiosConfig() applies the AI-tuned timeout to Axios calls.
//
// ⚠️  IMPORTANT DIFFERENCE FROM adaptiveFetch() and withDbTimeout():
//     Axios cannot auto-track signals. You must call controlPlane.track()
//     manually after success AND in the catch block.
//
//     WHY? getAdaptiveAxiosConfig() only returns a plain config object
//     { timeout: <ms> }. The SDK has no hook into when Axios finishes,
//     so it cannot measure latency or report the outcome automatically.
//
// Use this only if you are deeply committed to Axios.
// Prefer adaptiveFetch() for fully automatic behaviour.
//
// HOW TO TEST IT:
//   GET /notify?delay=1  → Axios succeeds (1s delay inside ~5s AI timeout)
//   GET /notify?delay=8  → Axios times out (8s > AI timeout)

app.get('/notify', async (req, res) => {
  const simulatedDelay = parseInt(req.query.delay) || 1; // delay in seconds
  console.log(`\n🔔 [/notify] Sending notification | simulated delay: ${simulatedDelay}s`);

  // ── STEP 1: Get the AI-tuned Axios config ─────────────────────────────────
  // getAdaptiveAxiosConfig() reads recommended_timeout_ms from local cache
  // (zero network cost) and returns: { timeout: <AI-calculated-ms> }
  // You never hardcode the timeout number — the AI sets it from your p99.
  const axiosConfig = controlPlane.getAdaptiveAxiosConfig('/notifications/send');
  console.log(`⏱️  [/notify] Axios timeout (AI-set, not hardcoded): ${axiosConfig.timeout}ms`);

  // ── STEP 2: Start the timer manually (needed because Axios can't auto-track)
  const start = Date.now();

  try {
    // ── STEP 3: Make the Axios call with AI-tuned config ────────────────────
    // Spread axiosConfig to inject the timeout into any Axios call.
    // In your real app this would be:
    //   await axios.post('https://api.sendgrid.com/v3/mail/send', payload, axiosConfig);
    await axios.get(
      `http://localhost:${process.env.PORT || 3001}/dummy-delay?ms=${simulatedDelay * 1000}`,  // simulates a slow notification API
      axiosConfig                                      // ← AI timeout injected here
    );

    // ── STEP 4: Manually track success ⚠️ ────────────────────────────────────
    // This is the only manual step. With adaptiveFetch() this would be automatic.
    const latency = Date.now() - start;
    controlPlane.track('/notifications/send', latency, 'success'); // ← manual required
    console.log(`✅ [/notify] Notification sent in ${latency}ms`);

    return res.json({
      success: true,
      latency_ms: latency,
      axios_timeout_used_ms: axiosConfig.timeout,
      note: 'Timeout was set automatically by AI — no hardcoded number in code.',
    });

  } catch (error) {
    // ── STEP 5: Manually track error ⚠️ ──────────────────────────────────────
    // Axios timeout throws with error.code === 'ECONNABORTED'.
    // Also manual — SDK has no way to detect this automatically.
    const latency = Date.now() - start;
    const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
    controlPlane.track('/notifications/send', latency, 'error'); // ← manual required

    console.error(`❌ [/notify] ${isTimeout ? 'Axios timed out' : 'Axios error'}: ${error.message}`);

    return res.status(504).json({
      success: false,
      error: isTimeout
        ? `Notification API timed out after ${latency}ms (AI-set ${axiosConfig.timeout}ms limit)`
        : `Error: ${error.message}`,
      tip: 'For automatic tracking, prefer adaptiveFetch() over Axios.',
    });
  }
});


// =====================================
// ADAPTIVE TIMEOUT DEMO — EXTERNAL API
// =====================================
// 
// WHAT THIS DEMONSTRATES:
// In a real checkout flow, your server makes an outgoing request to a
// 3rd-party payment gateway (Stripe, Razorpay, etc.). If that gateway becomes
// slow, a hardcoded 30s timeout means 30s of stuck connections, causing
// your server to run out of memory and crash.
//
// With controlPlane.adaptiveFetch(), the AI automatically tunes the timeout
// per-endpoint based on your historical p99 latency. If the gateway normally
// takes 500ms (p99), the SDK enforces the AI-tuned threshold. If the
// gateway is currently spiking (detected via rising latency signals), the SDK
// keeps the tight timeout to fail fast and protect your server pool.
//
// HOW TO TEST IT:
//   Healthy:  GET /payment?delay=200   → succeeds in ~200ms
//   Timeout:  GET /payment?delay=9000  → fails fast with adaptive timeout error
//   Compare:  Without adaptiveFetch, this would hang for 30+ seconds!

app.get('/payment', async (req, res) => {
  const startTime = Date.now();

  // Simulate the end-user's order details
  const orderId  = 'ORD-' + Date.now();
  const amount   = 1299;

  // Control how slow the fake payment gateway is (in ms)
  // In production this is determined by the real payment API's health
  const simulatedGatewayDelay = parseInt(req.query.delay) || 400;

  console.log(`\n💳 [/payment] Processing order ${orderId} for ₹${amount}`);
  console.log(`💳 [/payment] Simulated payment gateway delay: ${simulatedGatewayDelay}ms`);

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // STEP 1: Read the AI-calculated timeout from local config cache (0ms cost)
    //
    // The control plane has been tracking signals for '/payments/gateway' and
    // has computed a recommended timeout based on your historical p99 latency.
    //
    // If the payment gateway is normally fast (p99=300ms), the SDK enforces
    // the AI-tuned threshold. If it's slow (p99=8000ms), it allows
    // up to 16500ms. The AI calibrates this for every single endpoint.
    // ──────────────────────────────────────────────────────────────────────────
    const config = controlPlane.getConfig('/payments/gateway');
    const { recommended_timeout_ms, active, baseline_p99_ms } = config.adaptive_timeout || {
      recommended_timeout_ms: 5000,
      active: false,
      baseline_p99_ms: 0,
    };

    console.log(`⏱️  [/payment] AI Adaptive Timeout config:`);
    console.log(`    - recommended_timeout_ms : ${recommended_timeout_ms}ms`);
    console.log(`    - active (latency spike?) : ${active}`);
    console.log(`    - baseline_p99_ms        : ${baseline_p99_ms}ms`);

    if (active) {
      console.log(`⚠️  [/payment] Latency spike detected! Timeout reduced to ${recommended_timeout_ms}ms to fail fast.`);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 2: Call the external payment gateway using adaptiveFetch()
    //
    // This is a drop-in replacement for fetch(). The only difference is the
    // first argument — the config endpoint key ('/payments/gateway') which it
    // uses to look up the AI-calculated timeout from the local cache.
    //
    // If the gateway takes longer than recommended_timeout_ms, the request is
    // automatically aborted and an error is thrown. No more 30-second hangs!
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`🔗 [/payment] Calling payment gateway via adaptiveFetch()...`);

    // We use a local endpoint to simulate a real slow HTTP endpoint without geographic lag
    const gatewayUrl = `http://localhost:${process.env.PORT || 3001}/dummy-delay?ms=${simulatedGatewayDelay}`;

    const gatewayResponse = await controlPlane.adaptiveFetch(
      '/payments/gateway',   // config key (for timeout lookup)
      gatewayUrl,            // actual URL to call
      {
        method: 'GET',       // in production: POST with payment body
        headers: { 'Content-Type': 'application/json' },
      }
    );

    // ✅ adaptiveFetch() already tracked the success signal automatically!
    const latency = Date.now() - startTime;
    console.log(`✅ [/payment] Payment gateway responded. Success!`);

    return res.json({
      success: true,
      orderId,
      amount,
      message: `Payment processed in ${latency}ms`,
      adaptive_timeout_was_active: active,
      timeout_enforced_ms: recommended_timeout_ms,
    });

  } catch (error) {
    // ✅ adaptiveFetch() already tracked the error signal automatically!
    const isTimeout = error.message.includes('timed out');
    console.error(`❌ [/payment] ${isTimeout ? 'Gateway timed out' : 'Gateway error'}: ${error.message}`);

    return res.status(504).json({
      success: false,
      orderId,
      error: isTimeout
        ? `Payment gateway timed out (AI-enforced timeout, not the default 30s)`
        : `Payment gateway error: ${error.message}`,
      adaptive_timeout_ms: recommended_timeout_ms,
      tip: 'The AI Control Plane detected a latency spike and failed fast. Retry shortly.',
    });
  }
});

// =====================================
// HYBRID TIMEOUT DEMO — ENDPOINT + FETCH
// =====================================
//
// WHAT THIS DEMONSTRATES:
// This endpoint combines both approaches for maximum reliability:
// 1. withEndpointTimeout protects the entire route (so it never hangs).
// 2. adaptiveFetch protects a specific 3rd-party API call made inside the route.
//
// If the 3rd-party API is slow, adaptiveFetch kills it and the endpoint can gracefully
// recover (e.g., returning partial data to the user).
// If the handler itself is slow for some other reason, withEndpointTimeout kills the route.
//
// HOW TO TEST IT:
//   Healthy:                  GET /combined?delay=100
//   Slow Gateway (Recovered): GET /combined?delay=8000
//

// Helper delay function
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

app.get('/combined',
  controlPlane.withEndpointTimeout('/combined', async (req, res) => {
    const simulatedGatewayDelay = parseInt(req.query.delay) || 100;
    console.log(`\n🔄 [/combined] Processing complex request | simulated gateway delay: ${simulatedGatewayDelay}ms`);

    let recommendations = [];
    let gatewaySuccess = true;

    await sleep(100);

    try {
      // ──────────────────────────────────────────────────────────────────────────
      // Granular protection: Call an external API that we know is flaky
      // Using adaptiveFetch means if it is slow, it will throw an error FAST,
      // allowing us to catch it and still respond to the user.
      // ───────────────────────────────────────────────────`───────────────────────
      console.log(`🔗 [/combined] Fetching recommendations via adaptiveFetch()...`);
      
      const gatewayUrl = `http://localhost:${process.env.PORT || 3001}/dummy-delay?ms=${simulatedGatewayDelay}`;
      
      // We track this specific dependency separately under '/payments/gateway' config
      // to reuse the timeout settings we already demonstrated
      await controlPlane.adaptiveFetch('/payments/gateway', gatewayUrl);
      
      recommendations = ['Product A', 'Product B'];
      console.log(`✅ [/combined] Recommendations fetched successfully.`);
      
    } catch (error) {
      // ──────────────────────────────────────────────────────────────────────────
      // Graceful Recovery: We caught the timeout from adaptiveFetch!
      // The overall endpoint (/combined) is still healthy and running.
      // ──────────────────────────────────────────────────────────────────────────
      gatewaySuccess = false;
      console.error(`⚠️  [/combined] Recommendations API failed/timed out, but we are recovering gracefully.`);
      recommendations = ['Fallback Product 1']; // Provide fallback data
    }

    // Return a successful response even if the secondary API failed
    return res.json({
      success: true,
      message: 'Request processed successfully',
      gateway_status: gatewaySuccess ? 'success' : 'failed_but_recovered',
      recommendations: recommendations,
      tip: gatewaySuccess 
        ? 'Try passing ?delay=8000 to see granular timeout recovery in action.'
        : 'adaptiveFetch killed the slow connection, allowing this endpoint to finish gracefully without the main withEndpointTimeout firing.'
    });
  })
);


// =====================================
// REQUEST COALESCING DEMO
// =====================================
//
// WHAT THIS DEMONSTRATES:
// Request Coalescing (Collapsing) ensures that multiple simultaneous requests
// for the same resource only trigger ONE backend call.
//
// This is critical during "Cache Stampedes" where 1000s of users hit your 
// server the moment a cache expires. Instead of 1000 DB queries, you make ONE.
//
// HOW TO TEST IT:
//   Use a tool like autocannon or hit this endpoint multiple times quickly.
//   Watch the server logs — you will see multiple "Coalesce Demo" requests
//   but only ONE "💾 Executing expensive DB query" log.
//
app.get('/coalesce-demo', 
  controlPlane.withEndpointTimeout('/coalesce-demo', async (req, res) => {
    console.log(`🤝 [/coalesce-demo] Request received`);
    // console.log(req.controlPlane)

    // This logic is now coalesced automatically if AI enables it!
    // Multiple simultaneous requests will share the same DB result.
    console.log('💾 [/coalesce-demo] MISS! Executing expensive DB query...');
    // Simulate a slow database query
    await sleep(1000); 
    return {
      timestamp: new Date().toISOString(),
      data: 'This result was shared across all simultaneous callers via withEndpointTimeout!'
    };
  })
);

// New Manual Coalescing Example using middleware
app.get('/manual-coalesce',
  controlPlane.middleware('/manual-coalesce'),
  async (req, res) => {
    console.log(`🤝 [/manual-coalesce] Request received`);

    // You can manually coalesce ANY logic using req.controlPlane.coalesce
    const data = await req.controlPlane.coalesce('my-custom-key', async () => {
      console.log('🔧 [/manual-coalesce] Running expensive calculation...');
      await sleep(1000);
      return { result: Math.random() };
    });

    res.json({ success: true, data });
  }
);

// [NEW] Automatic Middleware Coalescing Example
// No wrapper needed, just standard middleware + a regular handler!
app.get('/middleware-coalesce-auto',
  controlPlane.middleware('/middleware-coalesce-auto'),
  async (req, res) => {
    console.log(`🤝 [/middleware-coalesce-auto] Request received`);
    console.log('🔧 [/middleware-coalesce-auto] Handler executing heavy logic...');
    await sleep(1000);
    res.json({
      success: true,
      data: 'This result was automatically shared across callers via middleware!',
      timestamp: new Date().toISOString()
    });
  }
);


// =====================================
// REQUEST COALESCING + DB TIMEOUT DEMO
// =====================================
app.get('/coalesce-db-demo',
  controlPlane.middleware('/coalesce-db-demo'),            // Outer API metrics key
  async (req, res) => {
    console.log(`🤝 [/coalesce-db-demo] Request received`);

    const data = await req.controlPlane.coalesce('db-coalesce-key', async () => {
      console.log('💾 [/coalesce-db-demo] MISS! Executing DB query with AI Timeout...');
      
      // DB Timeout protection uses a strictly UNIQUE key for internal DB metrics!
      return await controlPlane.withDbTimeout('/db/coalesce-query', async () => {
        await sleep(1000);
        return [{ id: 101, status: 'Active DB Coalescing!' }];
      });
    });

    res.json({ success: true, data });
  }
);

// =====================================
// REQUEST COALESCING + ADAPTIVE FETCH DEMO
// =====================================
app.get('/coalesce-fetch-demo',
  controlPlane.middleware('/coalesce-fetch-demo'),         // Outer API metrics key
  async (req, res) => {
    console.log(`🤝 [/coalesce-fetch-demo] Request received`);

    const data = await req.controlPlane.coalesce('fetch-coalesce-key', async () => {
      console.log('🔗 [/coalesce-fetch-demo] MISS! Fetching via adaptiveFetch...');
      
      const gatewayUrl = `http://localhost:${process.env.PORT || 3001}/dummy-delay?ms=1000`;
      // Fetch protection uses a strictly UNIQUE key for external API metrics!
      const response = await controlPlane.adaptiveFetch('/external/fetch-gateway', gatewayUrl);
      return await response.json();
    });

    res.json({ success: true, data });
  }
);


// =====================================
// THE ULTIMATE DEMO (All Features Together)
// =====================================
//
// WHAT THIS DEMONSTRATES:
// Combining EVERY protection mechanism in a single route:
//   1. withEndpointTimeout (Outer Protection + Adaptive Timeout)
//   2. Circuit Breaker (shouldSkip)
//   3. Rate Limiting (isRateLimitedCustomer)
//   4. Request Coalescing (req.controlPlane.coalesce)
//   5. withDbTimeout (DB-level protection)
//   6. adaptiveFetch (External API protection)
//
app.get('/ultimate-demo', 
  controlPlane.withEndpointTimeout('/ultimate-demo', async (req, res) => {
    const cp = req.controlPlane;
    console.log(`🌟 [/ultimate-demo] The "Kitchen Sink" request received from ${cp.customer_identifier || 'unknown'}`);

    // [1] CIRCUIT BREAKER
    if (cp.shouldSkip) {
      console.warn('⚡ [/ultimate-demo] Circuit Breaker OPEN! Short-circuiting request.');
      return res.status(cp.statusCode).json({
        success: false,
        error: 'System is currently degraded (Circuit Breaker)',
        reason: cp.reason
      });
    }

    // [2] RATE LIMITING (Edge-side sliding window)
    if (cp.isRateLimitedCustomer) {
      console.warn(`🚫 [/ultimate-demo] Rate limit exceeded for IP.`);
      return res.status(429).json({ success: false, error: 'Too many requests' });
    }

    // [3] MANUAL REQUEST COALESCING
    // Collapses multiple simultaneous intensive calculations into one result
    const sharedCalculation = await cp.coalesce('intensive-calc', async () => {
      console.log('🧠 [/ultimate-demo] Running intensive shared calculation...');
      await sleep(500);
      return { score: Math.random() * 100 };
    });

    // [4] DB TIMEOUT PROTECTION
    const dbData = await controlPlane.withDbTimeout('/db/users', async () => {
      console.log('💾 [/ultimate-demo] Fetching users from DB...');
      await sleep(200);
      return [{ id: 1, name: 'AI Demo User' }];
    });

    // [5] EXTERNAL API PROTECTION (adaptiveFetch)
    // This will use its own AI-reduced timeout independently!
    let externalApi;
    try {
      const response = await controlPlane.adaptiveFetch('/payments/gateway', 'http://localhost:3001/dummy-delay?ms=100');
      externalApi = await response.json();
    } catch (e) {
      externalApi = { status: 'failed_but_caught_locally' };
    }

    return {
      success: true,
      message: 'Processed through 6 different AI protection layers!',
      signals: {
        coalesced_calc: sharedCalculation,
        db_data: dbData,
        external_api: externalApi
      },
      ai_context: {
        timeout_enforced: cp.config.adaptive_timeout.recommended_timeout_ms,
        load_shedding_active: cp.isLoadShedding
      }
    };
  })
);


// =====================================
// LOCAL DUMMY DELAY API (For stable testing)
// =====================================
app.get('/dummy-delay', (req, res) => {
  const ms = parseInt(req.query.ms) || 0;
  setTimeout(() => res.json({ success: true, delayed: ms }), ms);
});


const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    console.log('⏳ Initializing AI Control Plane SDK...');
    const endpointsToInitialize = [
      '/login',
      '/products',
      '/checkout',
      '/search',
      '/api/rate-limit',
      '/products-error',
      '/payments/gateway',     // Adaptive timeout: external API (fetch)
      '/db/users',             // Adaptive timeout: DB calls
      '/notifications/send',   // Adaptive timeout: Axios example
      '/combined',             // Adaptive timeout: Hybrid example
      '/coalesce-demo',        // Request Coalescing Demo
      '/manual-coalesce',      // Manual Coalescing Example
      '/middleware-coalesce-auto', // [NEW] Automatic Middleware Coalescing
      '/coalesce-db-demo',     // [NEW] Outer metrics for DB demo
      '/db/coalesce-query',    // [NEW] Inner metrics for DB demo
      '/coalesce-fetch-demo',  // [NEW] Outer metrics for fetch demo
      '/external/fetch-gateway', // [NEW] Inner metrics for fetch demo
      '/ultimate-demo',        // The Kitchen Sink Example
      '/user-profile-trace',
      '/beta-feature',
      '/pricing'
    ];
    await controlPlane.initialize(endpointsToInitialize);
    
    app.listen(PORT, () => {
      console.log(`🚀 Demo Service running on port ${PORT}`);
      console.log(`📦 Using AI Control Plane SDK (Locally Linked)`);
      console.log(`🔑 API Key: ${process.env.CONTROL_PLANE_API_KEY ? '✓ Configured' : '✗ Missing (set CONTROL_PLANE_API_KEY)'}`);
      console.log(`\nEndpoints:`);
      console.log(`  Middleware:  POST /login, GET /products, GET /products/:id`);
      console.log(`  Manual:      POST /checkout, GET /search?q=laptop`);
      console.log(`  Adaptive Timeout (Endpoint): GET /products?delay=8000`);
      console.log(`  Adaptive Timeout (DB):    GET /users?delay=100      (try delay=8000)`);
      console.log(`  Adaptive Timeout (fetch): GET /payment?delay=400    (try delay=9000)`);
      console.log(`  Adaptive Timeout (axios): GET /notify?delay=1       (try delay=8)`);
      console.log(`  Request Coalescing:       GET /coalesce-demo        (automatic collapsing via wrapper)`);
      console.log(`  Manual Coalescing:        GET /manual-coalesce      (manual collapsing via req.controlPlane.coalesce)`);
      console.log(`  Auto Middleware:          GET /middleware-coalesce-auto (NEW: automatic collapsing in middleware)`);
      console.log(`  Coalesce + DB Timeout:    GET /coalesce-db-demo     (NEW: manual coalescing + withDbTimeout)`);
      console.log(`  Coalesce + fetch:         GET /coalesce-fetch-demo  (NEW: manual coalescing + adaptiveFetch)`);
      console.log(`  🔥 ULTIMATE DEMO:         GET /ultimate-demo        (6 features combined in ONE route)`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
  }
}


startServer();

// =====================================
// FEATURE FLAGS APPROACH (Automatic)
// =====================================

// This endpoint uses the AUTOMATIC approach.
// The middleware handles:
// 1. Linking the request to an active Flag Name
// 2. Automatically tracking performance (latency/status) for that flag
app.get('/beta-feature', 
  // Integration via middleware: automatically tracks flag context
  controlPlane.middleware('/beta-feature', { flagName: 'experimental-ui' }),
  async (req, res) => {
    // Zero-latency evaluation using consistent hashing
    const isBeta = controlPlane.isEnabled('experimental-ui', req.query.userId || 'anon-123');
    
    // Simulate some work that might be slow if the flag is enabled
    const sleep = isBeta ? 1500 : 50; 
    await new Promise(r => setTimeout(r, sleep));

    res.json({ 
      feature: 'Experimental UI',
      active: isBeta,
      latency: sleep,
      note: 'Performance for this request auto-attributes to flag "experimental-ui" in the AI engine'
    });
  }
);


// =====================================
// EXAMPLE 2: Dynamic Logic (Pricing/Discounts)
// =====================================

app.get('/pricing', 
  // Attribution: We want the AI to watch the performance of the 'new-pricing-engine' flag
  controlPlane.middleware('/pricing', { flagName: 'new-pricing-engine' }),
  async (req, res) => {
    const userId = req.query.userId || 'guest';
    
    // Check if the user is in the 'new-pricing-engine' group
    const useNewEngine = controlPlane.isEnabled('new-pricing-engine', userId);
    
    let price = 100;
    let description = 'Standard Pricing';

    if (useNewEngine) {
      // The new pricing engine might involve complex (slow) calculations
      // If this is TOO slow, the NeuralControl AI will kill it!
        console.log("Using new pricing engine (EXTREMELY SLOW)")
      const delay = 4000 + Math.random() * 500; // Force 4s+ latency to trigger AI
      await new Promise(r => setTimeout(r, delay));
      
      price = 85; // 15% discount
      description = 'Dynamic Beta Pricing (Experimental)';
    }else{
      console.log("Using legacy pricing engine")
    }

    res.json({
      price: price,
      description: description,
      engine: useNewEngine ? 'v2-beta' : 'v1-legacy',
      note: 'AI is monitoring this engine for latency regressions.'
    });
  }
);

// =====================================
// EXAMPLE 3: Adaptive Timeout + Feature Flags
// =====================================

app.get('/beta-timeout', 
  // Wrapper integration: combine adaptive timeouts with feature flag attribution
  controlPlane.withEndpointTimeout('/beta-timeout', async (req, res) => {
    const userId = req.query.userId || 'anon-999';
    const isActive = controlPlane.isEnabled('beta-timeout-flag', userId);

    console.log(`⏱️ Beta Timeout request (Flag 'beta-timeout-flag': ${isActive})`);

    // If the flag is active, we simulate a very slow operation
    // The adaptive timeout will hit and the AI will attribute it to the flag!
    if (isActive) {
      const delay = parseInt(req.query.delay) || 4000;
      console.log(`⏳ [Flag Active] Simulating slow work: ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    res.json({
      success: true,
      flag_active: isActive,
      message: isActive ? 'Slow path completed' : 'Fast path completed'
    });
  }, { flagName: 'beta-timeout-flag' }) // NEW: Link the wrapper to the flag
);

// =====================================
// EXAMPLE 4: Combined Tracing + Feature Flags
// =====================================

app.post('/experimental-checkout', 
  // 1. Attribution: Tag telemetry with the feature flag
  controlPlane.middleware('/experimental-checkout', { flagName: 'new-checkout-flow' }),
  async (req, res) => {
    const userId = req.body.userId || 'guest';
    
    // 2. Evaluation: Decide which logic to run
    const useNewFlow = controlPlane.isEnabled('new-checkout-flow', userId);

    console.log(`🛒 Experimental Checkout (Flag 'new-checkout-flow': ${useNewFlow})`);

    if (useNewFlow) {
      // 3. Tracing: Provide deep forensic evidence for the AI
      // Even if the AI kills the flag, these spans show WHY it was slow.
      
      const validationSpan = req.controlPlane.startSpan("Validation: High Precision");
      await new Promise(r => setTimeout(r, 100)); // Simulate validation
      validationSpan.end({ status: 'ok' });

      const paymentSpan = req.controlPlane.startSpan("Payment: New Gateway (Experimental)");
      // Simulate a BUGGY, slow payment gateway
      const delay = 3000 + Math.random() * 1000;
      await new Promise(r => setTimeout(r, delay));
      paymentSpan.end({ gateway: 'crypto-pay-v2', latency: delay });

      const dbSpan = req.controlPlane.startSpan("DB: Update Inventory");
      await new Promise(r => setTimeout(r, 50));
      dbSpan.end({ status: 'updated' });

      res.json({
        success: true,
        flow: 'experimental-v2',
        message: 'Checkout complete (Slow path detected by AI)'
      });
    } else {
      // Legacy stable flow
      await new Promise(r => setTimeout(r, 200));
      res.json({
        success: true,
        flow: 'legacy-v1',
        message: 'Checkout complete (Fast path)'
      });
    }
  }
);

// =====================================
// AGENTIC PAYMENTS DEMO ENDPOINT
// =====================================
//
// THIS IS THE DOCUMENTED INTEGRATION PATTERN.
// Copy this pattern into any NeuralControl-protected service to add
// x402 + ERC-8004 agentic payment support without touching the SDK.
//
// HOW IT WORKS:
//   1. SDK middleware runs locally — zero latency rate limit decision.
//   2. Route handler sees isRateLimitedCustomer === true.
//   3. Route handler checks for 'x-agent-id' header.
//   4. If agent header present → call /api/agentic/invoice/ on control plane.
//   5. Return the 402 invoice to the agent — it will pay autonomously.
//   6. After payment, agent calls /api/agentic/verify directly.
//   7. Next request has active burst window → goes through normally.
//
// HOW TO TEST:
//   Normal user:  curl http://localhost:3001/api/agent-data
//   AI Agent:     curl http://localhost:3001/api/agent-data -H "x-agent-id: agent_good_bot_v1"

const CONTROL_PLANE_URL = process.env.CONTROL_PLANE_URL || 'http://localhost:8000';
const API_KEY = 'acp_f7463837dc567446d8059e44956cf4895072d2a9';

app.get('/api/agent-data',
  controlPlane.middleware('/api/agent-data'),
  async (req, res) => {

    // ── Step 1: Check if rate limited ─────────────────────────────────────────
    if (req.controlPlane.isRateLimitedCustomer) {

      // ── Step 2: Is this an AI Agent? ────────────────────────────────────────
      // Regular browsers/humans never send x-agent-id.
      // Only AI agents that follow the ERC-8004 standard send this header.
      const agentId = req.headers['x-agent-id'];

      if (agentId) {
        try {
          // ── Step 3: Ask the control plane for a payment invoice ──────────────
          // The control plane checks ERC-8004 reputation and issues an invoice
          // if the agent is trusted and the customer has enabled agentic payments.
          const invoiceRes = await axios.post(
            `${CONTROL_PLANE_URL}/api/agentic/invoice/hi-service/api/agent-data`,
            { agent_id: agentId },
            { headers: { Authorization: `Bearer ${API_KEY}` } }
          );

          const invoice = invoiceRes.data;

          // If the agent already has a verified payment, grant access!
          if (invoice.status === 'authorized') {
            console.log(`🔓 Active burst window found for agent '${agentId}'`);
            // Return the normal 200 response directly to bypass the 429 block
            return res.json({
              success: true,
              timestamp: new Date().toISOString(),
              data: {
                market_signals: [
                  { symbol: 'AVAX', price: 28.45, change_24h: '+3.2%' },
                  { symbol: 'ETH',  price: 3210.00, change_24h: '+1.8%' },
                  { symbol: 'BTC',  price: 67500.00, change_24h: '+0.5%' }
                ],
                source: 'NeuralControl Demo Market Feed (BURST ACCESS)'
              }
            });
          } else {
            // ── Step 4: Return the x402 invoice to the agent ─────────────────────
            // The agent receives this and autonomously pays on Avalanche Fuji.
            // HTTP 402 = "Payment Required" — the x402 protocol status code.
            console.log(`💸 Issuing x402 invoice #${invoice.invoice_id} to agent '${agentId}'`);
            console.log(`   Pay ${invoice.amount_wei} wei → ${invoice.pay_to_wallet}`);

            return res.status(402).json({
              error: 'x402 Payment Required',
              invoice_id: invoice.invoice_id,
              pay_to_wallet: invoice.pay_to_wallet,
              amount_wei: invoice.amount_wei,
              network: 'Avalanche Fuji Testnet (C-Chain)',
              verify_url: `${CONTROL_PLANE_URL}/api/agentic/verify`,
              agent_reputation: invoice.reputation,
              instructions: [
                '1. Send the amount_wei in AVAX to pay_to_wallet on Avalanche Fuji C-Chain',
                '2. POST your tx_hash to verify_url with your invoice_id',
                '3. Retry this endpoint — your burst window will be active'
              ]
            });
          }

        } catch (err) {
          // Control plane said the agent is untrusted or customer hasn't enabled payments
          // Fall through to regular 429
          // We don't log this heavily to avoid spamming for bad bots
        }
      }

      // ── Regular 429 for humans and untrusted agents ──────────────────────────
      const identifier = req.controlPlane.customer_identifier || req.ip;
      console.log(`🚫 Rate limit hit for ${identifier}`);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Slow down or use an ERC-8004 registered agent to pay for burst access.',
        retry_after: req.controlPlane.retryAfter,
        tip: 'AI Agents: Send x-agent-id header to unlock x402 Pay-to-Bypass'
      });
    }

    // ── Normal response — rate limit not hit ──────────────────────────────────
    const data = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        market_signals: [
          { symbol: 'AVAX', price: 28.45, change_24h: '+3.2%' },
          { symbol: 'ETH',  price: 3210.00, change_24h: '+1.8%' },
          { symbol: 'BTC',  price: 67500.00, change_24h: '+0.5%' }
        ],
        source: 'NeuralControl Demo Market Feed',
        rate_limit_remaining: req.controlPlane.config?.rate_limit_rule_rpm || 'unlimited'
      }
    };

    console.log(`✅ Serving agent-data to ${req.headers['x-agent-id'] || 'human'}`);
    res.json(data);
  }
);


// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 2: PAY-PER-REQUEST (Monetization)
// This endpoint DOES NOT use rate limits. It charges 0.01 AVAX for every single request.
// Developers can copy-paste this to monetize expensive AI endpoints (like image generation).
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/pay-per-request', 
  controlPlane.middleware('/api/pay-per-request'),
  async (req, res) => {
  const agentId = req.headers['x-agent-id'];

  if (!agentId) {
    return res.status(403).json({ error: "Access Denied. Only AI Agents with x-agent-id can buy this data." });
  }

  try {
    // 1. Ask NeuralControl for an invoice (or check if they have a burst window)
    const invoiceRes = await axios.post(
      `${CONTROL_PLANE_URL}/api/agentic/invoice/hi-service/api/pay-per-request`,
      { agent_id: agentId, mode: 'pay_per_request' },
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );
    const invoice = invoiceRes.data;

    // 2. If they have paid and have an active burst window, serve the data!
    if (invoice.status === 'authorized') {
      console.log(`✅ Payment verified! Serving premium data to agent '${agentId}'`);
      return res.json({
        success: true,
        data: "Here is your highly expensive AI-generated premium data!"
      });
    }

    // 3. If they haven't paid, issue the 402 invoice on EVERY request
    console.log(`💸 Issuing x402 invoice to agent '${agentId}' for pay-per-request endpoint`);
    return res.status(402).json({
      error: 'x402 Payment Required',
      invoice_id: invoice.invoice_id,
      pay_to_wallet: invoice.pay_to_wallet,
      amount_wei: invoice.amount_wei,
      network: 'Avalanche Fuji Testnet (C-Chain)',
      verify_url: `${CONTROL_PLANE_URL}/api/agentic/verify`,
      agent_reputation: invoice.reputation,
      instructions: [
        "1. Send the amount_wei in AVAX to pay_to_wallet on Avalanche Fuji C-Chain",
        "2. POST your tx_hash to verify_url with your invoice_id",
        "3. Retry this endpoint"
      ]
    });

  } catch (err) {
    return res.status(500).json({ error: "Failed to communicate with NeuralControl" });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 3: LITE SDK (Standalone Monetization without NeuralControl Control Plane)
// ─────────────────────────────────────────────────────────────────────────────

const MY_WALLET = '0x708EEE9Ff754e0724B218d14671af961fA610DBC';
const PRICE_WEI = '10000000000000000'; // 0.01 AVAX
const WEBSITE_PRIVATE_KEY = '0xbbcf6daae8eadc905a02bdf36eeda1e1bcab5dae5b62feae3445eb1872b835eb';

// Local in-memory set to prevent replay attacks during testing
const usedTxHashes = new Set();

app.get('/api/lite-generate', async (req, res) => {
  const agentId = req.headers['x-agent-id'];
  const txHash = req.headers['x-payment-hash'];

  if (!agentId) {
    return res.status(403).json({ error: "Access Denied. Only AI Agents with x-agent-id can buy this data." });
  }

  // 1. Check Global Reputation on Blockchain
  let score = await getAgentScore(agentId);
  if (score !== null && score < 40) {
    return res.status(403).json({ error: "Your global AI reputation is too low." });
  }

  // 2. If no hash provided, demand payment
  if (!txHash) {
    return res.status(402).json({
      error: "Payment Required",
      pay_to_wallet: MY_WALLET,
      amount_wei: PRICE_WEI,
      message: "Send the transaction hash in the x-payment-hash header!"
    });
  }

  // 3. Prevent replay attacks
  if (usedTxHashes.has(txHash)) {
    return res.status(403).json({ error: "Transaction hash already used!" });
  }

  // 4. Verify on-chain
  const verification = await verifyOnChain(txHash, MY_WALLET, PRICE_WEI);
  
  if (!verification.verified) {
    return res.status(400).json({ error: verification.reason });
  }

  // 5. Save hash to prevent reuse
  usedTxHashes.add(txHash);

  // 6. Detect Malicious Attack! (Simulated via query param)
  if (req.query.attack === "true") {
      console.log(`🚨 Attack detected from ${agentId}! Slashing score...`);
      
      const slashResult = await paymentsLite.slashAgentScore(
          agentId, 
          "Simulated SQL Injection detected in prompt", 
          20, // penalty points
          WEBSITE_PRIVATE_KEY
      );
      
      return res.status(403).json({ 
          error: "Attack detected. You have been reported to the global registry and permanently slashed.",
          slashResult: slashResult
      });
  }

  // 7. Serve premium data
  return res.json({ 
    success: true, 
    data: "Highly expensive AI generated output (LITE SDK)!",
    agent_score: score 
  });
});


// ── Start the server ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Demo service running on http://localhost:${PORT}`);
  console.log(`🤖 Agentic payments endpoint: http://localhost:${PORT}/api/agent-data`);
  console.log(`   Send 'x-agent-id' header to trigger x402 Pay-to-Bypass flow\n`);
});
