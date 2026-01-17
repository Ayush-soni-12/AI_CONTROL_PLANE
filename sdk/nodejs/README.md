# AI Control Plane SDK - Node.js

Easy integration for autonomous runtime control in your microservices.

## Installation
```bash
npm install ai-control-plane-sdk
```

## Quick Start (5 minutes)

### 1. Initialize SDK
```javascript
const ControlPlane = require('ai-control-plane-sdk');

const controlPlane = new ControlPlane({
  serviceName: 'my-service',
  controlPlaneUrl: 'http://control-plane:8000'
});
```

### 2. Use Middleware (Automatic Tracking)
```javascript
const express = require('express');
const app = express();

app.get('/products', 
  controlPlane.middleware('/products'),
  async (req, res) => {
    // Config is available in req.controlPlane
    if (req.controlPlane.shouldCache && cache['/products']) {
      return res.json(cache['/products']);
    }
    
    if (req.controlPlane.shouldSkip) {
      return res.json({ products: [] }); // Fallback
    }
    
    // Your business logic
    const products = await db.getProducts();
    res.json({ products });
  }
);
```

### 3. Manual Tracking (Without Middleware)
```javascript
app.post('/login', async (req, res) => {
  const start = Date.now();
  
  // Get config
  const config = await controlPlane.getConfig('/login');
  
  // Your business logic
  const result = await authenticate(req.body);
  
  // Track performance
  await controlPlane.track('/login', Date.now() - start, 'success');
  
  res.json(result);
});
```

## Configuration Options
```javascript
const controlPlane = new ControlPlane({
  serviceName: 'my-service',        // Required: Your service name
  controlPlaneUrl: 'http://...',    // Control plane URL
  configCacheTTL: 30000             // Cache config for 30 seconds
});
```

## API Reference

### `track(endpoint, latencyMs, status)`

Send performance signal to control plane.

**Parameters:**
- `endpoint` (string) - API endpoint (e.g., '/products')
- `latencyMs` (number) - Request latency in milliseconds
- `status` (string) - 'success' or 'error'

**Example:**
```javascript
await controlPlane.track('/api/users', 245, 'success');
```

### `getConfig(endpoint)`

Get runtime configuration from control plane.

**Returns:**
```javascript
{
  cache_enabled: true/false,
  circuit_breaker: true/false,
  reason: "explanation"
}
```

**Example:**
```javascript
const config = await controlPlane.getConfig('/products');
if (config.cache_enabled) {
  // Use cache
}
```

### `middleware(endpoint)`

Express middleware for automatic tracking.

**Example:**
```javascript
app.get('/products', 
  controlPlane.middleware('/products'),
  (req, res) => {
    // Config available in req.controlPlane
  }
);
```

## Use Cases

### Automatic Caching
```javascript
app.get('/products', 
  controlPlane.middleware('/products'),
  async (req, res) => {
    // Check cache
    if (req.controlPlane.shouldCache && cache.products) {
      return res.json(cache.products);
    }
    
    // Fetch from database
    const products = await db.getProducts();
    
    // Cache if enabled
    if (req.controlPlane.shouldCache) {
      cache.products = products;
    }
    
    res.json(products);
  }
);
```

### Circuit Breaker
```javascript
app.get('/external-api', 
  controlPlane.middleware('/external-api'),
  async (req, res) => {
    // Skip if circuit breaker active
    if (req.controlPlane.shouldSkip) {
      return res.json({ data: cachedData || [] });
    }
    
    // Call external API
    const data = await externalAPI.getData();
    res.json(data);
  }
);
```

## License

MIT