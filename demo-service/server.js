import express from "express";
const app = express();

// Middleware to parse JSON
app.use(express.json());

// Simple home route
app.get('/', (req, res) => {
  res.json({ message: 'Demo Service is running!' });
});



// Simulate slow database call
function slowDatabaseWork() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ userId: 123, username: 'testuser' });
    }, 600); // 600ms delay
  });
}

// Login endpoint
app.post('/login', async (req, res) => {
  console.log('📧 Login request received');
  
  // Start measuring time
  const startTime = Date.now();
  
  // Do slow work (simulate database)
  const user = await slowDatabaseWork();
  
  // Calculate how long it took
  const latency = Date.now() - startTime;
  
  console.log(`⏱️  Request took ${latency}ms`);

 // 🆕 SEND SIGNAL TO CONTROL PLANE
  await sendSignalToControlPlane('/login', latency, 'success');
  
  // Send response
  res.json({
    success: true,
    token: 'fake-jwt-token-abc123',
    user: user
  });
});


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


// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Demo Service running on http://localhost:${PORT}`);
});

