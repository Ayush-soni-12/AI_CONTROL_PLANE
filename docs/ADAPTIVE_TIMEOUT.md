# ⏱️ Adaptive Timeout

> **Protect your endpoints, internal connections, and third-party API limits dynamically.**

Adaptive Timeout eliminates the risk of hardcoded timeouts by using AI to constantly adjust timeout limits based on real-time p99 latency.

When your database, search service, or a third-party API (like Stripe) slows down, static timeouts (e.g. 30s) allow connections to hang, exhausting your server's connection pool and crashing your service. Adaptive Timeout tightly bounds requests during degradation so that they _fail fast_, saving your server's resources and keeping healthy endpoints online.

---

## 🎯 How It Works

1. **Continuous Monitoring:** The Control Plane SDK constantly monitors the latency of each registered endpoint/dependency.
2. **AI Calculation:** Background AI workers analyze healthy traffic to establish a stable p99 baseline.
3. **Threshold Setting:** The AI computes an optimal, stable fail-fast timeout threshold that is saved to your database. **The SDK fetches and enforces this stable timeout limit**, ensuring the timeout doesn't mistakenly expand during an incident if current latency spikes. (You can also set this threshold manually via the Operations Dashboard).
4. **Spike Detection (UI/UX):** If the current live latency spikes above the AI's internal alarm threshold, the control plane sets `isActive: true`. This flag is used strictly to power the red "Latency Spike Detected" warnings in your dashboard for visibility.

### Example Scenario

- **Healthy DB Query:** Averages 100ms. AI sets adaptive timeout to `700ms`.
- **Latency Spike:** DB becomes overloaded. Queries start taking 8000ms. The Control Plane flags `isActive: true`.
- **Result:** Instead of waiting 8000ms and consuming database connections, the SDK kills the query at exactly `700ms` and throws an error. Your server pool stays healthy.

---

## 🛠️ Usage Guidelines

The SDK provides three distinct layers of protection, natively supporting both Express routes and individual programmatic calls.

### 1. Global Route Protection (`withEndpointTimeout`)

Wrap an entire Express route to enforce a global timeout. If the route takes longer than the AI's calculation, a `504 Gateway Timeout` is returned immediately.

```javascript
app.get(
  "/products",
  controlPlane.withEndpointTimeout("/products", async (req, res) => {
    // If anything inside here takes too long, the endpoint fails fast.
    const products = await getProducts();
    res.json(products);
  }),
);
```

### 2. Granular DB Protection (`withDbTimeout`)

Wrap individual database or ORM calls. This actively severs the background connection when the timeout is reached, preventing "ghost" queries from leaking your DB connections.

```javascript
const users = await controlPlane.withDbTimeout(
  "/db/users",
  () => prisma.user.findMany(), // Works with any Promise-returning function
);
```

### 3. External API Protection (`adaptiveFetch`)

A drop-in replacement for the native JavaScript `fetch` API. Use this when calling third-party services (e.g. Payment Gateways, Email Providers) so that their slowness doesn't take down your server.

```javascript
try {
  const result = await controlPlane.adaptiveFetch(
    "/payments/gateway",
    "https://api.stripe.com/v1/charges",
    { method: "POST", body: data },
  );
} catch (error) {
  // Caught gracefully! The endpoint can fallback or skip.
}
```

---

## 🏗️ The Hybrid Approach (Recommended)

For maximum resilience, use **both** Endpoint and Granular protection simultaneously.

- **`withEndpointTimeout`** protects the _User Experience_ (guarantees the user never hangs indefinitely).
- **`adaptiveFetch` / `withDbTimeout`** protects the _Server Resources_ (guarantees internal sockets are forcefully closed).

By combining them, granular timeouts (which are inherently shorter) will fire first, allowing your endpoint to `catch` the error, gracefully degrade, and return partial data before the global endpoint timeout ever fires.

### Full Example Code:

```javascript
// 1. Protect the entire endpoint experience
app.get(
  "/combined",
  controlPlane.withEndpointTimeout("/combined", async (req, res) => {
    try {
      // 2. Protect the internal specific connection
      const paymentResult = await controlPlane.adaptiveFetch(
        "/payments/gateway",
        "http://slow-payment-api.local",
        { method: "GET" },
      );

      const data = await paymentResult.json();
      return res.json({ success: true, payment: data });
    } catch (error) {
      // 3. Graceful UI Recovery!
      // The granular connection was severed early, saving resources,
      // AND we can send a fallback response to the user before the global 504 hits!
      return res.json({
        success: false,
        message: "Payment delayed, but server is healthy!",
        fallback: true,
      });
    }
  }),
);
```
