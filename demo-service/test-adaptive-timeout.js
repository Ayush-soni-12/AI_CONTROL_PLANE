import fetch from 'node-fetch'; // Requires node-fetch or Node v18+

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

async function testEndpoint(name, path, delay) {
  console.log(`\n======================================================`);
  console.log(`🧪 Testing ${name} `);
  console.log(`   URL: ${BASE_URL}${path}?delay=${delay}`);
  console.log(`   Expected delay: ${delay}${path === '/notify' ? 's' : 'ms'}`);
  console.log(`======================================================`);
  
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${path}?delay=${delay}`);
    const data = await res.json();
    const latency = Date.now() - start;
    
    console.log(`\n📥 Status : ${res.status}`);
    console.log(`⏱️  Latency: ${latency}ms`);
    console.log(`📦 Body   :\n`, JSON.stringify(data, null, 2));
  } catch (err) {
    const latency = Date.now() - start;
    console.log(`\n❌ Error after ${latency}ms:`, err.message);
  }
}

async function runTests() {
  console.log("🚀 Starting Adaptive Timeout Tests");
  console.log("Make sure Server is running on port 3001.");

  // 1. Test DB Calls (/users) - Delay in milliseconds
  await testEndpoint("Database Call (Fast - Healthy)", "/users", 100);
  await testEndpoint("Database Call (Slow - Timeout Triggered)", "/users", 8000);

  // 2. Test External Fetch Calls (/payment) - Delay in milliseconds
  await testEndpoint("External API Fetch (Fast - Healthy)", "/payment", 400);
  await testEndpoint("External API Fetch (Slow - Timeout Triggered)", "/payment", 9000);

  // 3. Test Axios Calls (/notify) - Delay in seconds
  await testEndpoint("Axios Notification (Fast - Healthy)", "/notify", 1);
  await testEndpoint("Axios Notification (Slow - Timeout Triggered)", "/notify", 8);

  // 4. Test Hybrid/Combined Approach (/combined) - Delay in milliseconds
  await testEndpoint("Hybrid Endpoint (Fast Gateway)", "/combined", 100);
  await testEndpoint("Hybrid Endpoint (Slow Gateway - Graceful Recovery)", "/combined", 8000);
  
  console.log("\n✅ All tests completed.");
}

runTests();
