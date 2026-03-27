# 🚩 Feature Flags

The AI Control Plane SDK provides a highly optimized, **zero-latency** feature flag system tightly integrated with the AI Engine. 

Instead of waiting on network calls to evaluate flags, the SDK caches rollouts locally and evaluates them synchronously. If a newly rolled out feature flag causes latency spikes or high error rates on your endpoint, the AI Engine can dynamically disable the flag without human intervention.

---

## ✨ Features

- **Zero Latency**: Evaluation (`isEnabled()`) happens entirely in memory using consistent hashing. No network I/O block!
- **Consistent Hashing**: The same user will always receive the same flag state for a given rollout percentage.
- **AI Auto-Kill Switch**: If a new feature roll causes downstream issues, the AI Control Plane detects the anomaly and streams an `auto-disabled` update instantly.
- **Real-Time Push**: SDK listens to an SSE stream to apply flag updates instantly, falling back to a 30s polling cycle if disconnected.

---

## 🚀 Usage Guide

### Step 1: Create a Flag in the Dashboard
Before using a flag in your code, you must create it in the AI Control Plane Dashboard.
1. Go to the **Feature Flags** section in the Dashboard.
2. Create a new flag (e.g., `new_payment_gateway`).
3. Set an initial **Rollout Percentage** (e.g., 20%).

### Step 2: Enable Feature Flags in SDK
Enable feature flags in your SDK configuration:

```javascript
import ControlPlaneSDK from "neuralcontrol";

const controlPlane = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY,
  serviceName: "my-service",
  featureFlags: true,  // 👈 Enable feature flags here
});
```

### Step 3: Evaluating a Flag
Use `isEnabled(flagName, identifier)` to check if a feature should be shown. The second argument (identifier) is typically a User ID, Session ID, or IP Address — this guarantees that user "A" always falls into the same rollout bucket.

```javascript
app.get("/dashboard", async (req, res) => {
  const userId = req.user.id;
  
  // Returns true or false instantly based on internal memory cache!
  const hasNewDashboard = controlPlane.isEnabled("new_dashboard_ui", userId);

  if (hasNewDashboard) {
    return res.render("dashboard_v2");
  } else {
    return res.render("dashboard_v1");
  }
});
```

### Step 4: Tying Flags to Telemetry (For AI Auto-Kill)
To allow the AI Engine to monitor a feature flag's impact on your service, pass the `flagName` to your built-in Express wrappers. 

If the endpoint tied to this flag starts experiencing 500 errors or major latency spikes, the AI will register the anomaly and can instantly push an SSE event disabling the flag across your entire fleet.

#### Example: With standard `middleware()`
```javascript
app.post(
  "/api/checkout",
  controlPlane.middleware("/api/checkout", { 
    priority: "critical", 
    flagName: "new_payment_gateway" // 👈 AI monitors this flag's health
  }),
  async (req, res) => {
    const userId = req.user.id;
    
    // Evaluate the flag to branch logic
    if (controlPlane.isEnabled("new_payment_gateway", userId)) {
      await processNewStripeGateway(req.body);
    } else {
      await processLegacyGateway(req.body);
    }
    
    res.json({ success: true });
  }
);
```

#### Example: With `withEndpointTimeout()`
```javascript
app.post(
  "/api/checkout",
  controlPlane.withEndpointTimeout(
    "/api/checkout",
    async (req, res) => {
      const userId = req.user.id;
      let success;

      // Evaluate the flag to branch logic
      if (controlPlane.isEnabled("new_payment_gateway", userId)) {
        success = await processNewStripeGateway(req.body);
      } else {
        success = await processLegacyGateway(req.body);
      }
      
      res.json({ success });
    },
    { priority: "critical", flagName: "new_payment_gateway" } // 👈 Flag bound here
  )
);
```

---

## 🛠️ Flag States & Rules

The SDK evaluates the `status` and `rollout_percent` internally. A flag will return `false` if:
- It doesn't exist.
- Its status is `disabled` or `auto-disabled`.
- Its rollout percentage is `0`.
- The consistent hash for `(flagName + identifier)` falls outside the `rollout_percent` bucket.

Otherwise, it accurately returns `true` for a percentage of your users matching `rollout_percent`.
