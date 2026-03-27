# 🔍 Distributed Tracing

The AI Control Plane SDK includes a built-in, zero-overhead distributed tracing system. It generates OpenTelemetry-compatible trace IDs and allows you to measure the exact latency of individual operations (like database queries or external API calls) within a request.

---

## ✨ How It Works

1. **Auto-Generated Trace IDs**: When tracing is enabled, the SDK automatically generates a 32-character hex `trace_id` for every incoming request.
2. **Zero Overhead Default**: If tracing is disabled, all tracing methods return zero-overhead no-op stubs.
3. **Async Span Flushing**: Spans are aggregated in memory and flushed asynchronously to the control plane, ensuring your hot paths are never blocked.
4. **AI Observability correlation**: Traces are automatically attached to the performance signals sent to the AI Engine, allowing the system to correlate macro-level latency spikes with specific slow operations inside your code.

---

## 🚀 Enabling Tracing

Tracing is disabled by default to ensure zero performance impact. Enable it in your SDK configuration:

```javascript
import ControlPlaneSDK from "neuralcontrol";

const controlPlane = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY,
  serviceName: "my-service",
  tracing: true, // 👈 Enable distributed tracing here
});
```

---

## 📖 Usage

### 1. Accessing the Trace ID
You can access the generated `trace_id` from the Express request object to inject it into your logs or attach it to outgoing response headers.

```javascript
app.get("/api/users", controlPlane.middleware("/api/users"), (req, res) => {
  const traceId = req.controlPlane.traceId;
  
  // Example: Include trace ID in the response headers for client debugging
  res.setHeader('X-Trace-Id', traceId);
  
  // Example: Add to your logger
  logger.info(`Processing request`, { traceId });
  
  res.json({ users: [] });
});
```

### 2. Creating Custom Spans
You can wrap specific operations (like database calls or complex computations) in a span using `startSpan()`. This allows you to visualize exactly where time is being spent inside your endpoint.

#### Example: With standard `middleware()`
```javascript
app.get("/checkout", controlPlane.middleware("/checkout"), async (req, res) => {
  // 1. Start a span
  const dbSpan = req.controlPlane.startSpan("db_query:get_cart");
  
  const cart = await db.getCart(req.user.id);
  
  // 2. End the span (optionally attach custom attributes)
  dbSpan.end({ items_count: cart.items.length });

  // Start another span for downstream API
  const apiSpan = req.controlPlane.startSpan("api_call:payment_gateway");
  await processPayment(cart);
  apiSpan.end({ status: "success" });

  res.json({ success: true });
});
```

#### Example: With `withEndpointTimeout()`
```javascript
app.get(
  "/checkout", 
  controlPlane.withEndpointTimeout(
    "/checkout",
    async (req, res) => {
      // Spans work identically inside the withEndpointTimeout wrapper!
      const dbSpan = req.controlPlane.startSpan("db_query:get_cart");
      
      const cart = await db.getCart(req.user.id);
      dbSpan.end({ items_count: cart.items.length });

      res.json({ success: true });
    }

  )
);
```

---

## 🛠️ Tracing Architecture

The tracing feature avoids heavy third-party agent dependencies (like `@opentelemetry/api`). Deep inside the SDK, it:
- Generates a root span for the entire Express request.
- Manages an internal `SpanQueue`.
- Sends the `trace_id` natively within the telemetry signal to the RabbitMQ ingestor.

When tracing is set to `false`, `req.controlPlane.startSpan` returns a lightweight stub (`() => ({ end: () => {} })`), meaning you can heavily instrument your code without worrying about production overhead if you choose to turn tracing off.
