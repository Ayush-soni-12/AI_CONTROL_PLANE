# 📋 Queue Deferral Guide

Handle non-critical requests asynchronously to maintain system responsiveness during high load.

## What is Queue Deferral?

Queue deferral moves non-time-sensitive requests to an asynchronous queue for later processing, allowing your service to:

- Maintain low latency for critical operations
- Handle traffic spikes gracefully
- Process requests during off-peak hours
- Optimize resource utilization

**Think of it as:** Taking a number at a deli counter instead of blocking the line.

## When to Use Queue Deferral

### ✅ Perfect For:

- **Background Jobs** - Report generation, data exports
- **Batch Processing** - Bulk operations, mass emails
- **Non-Critical Operations** - Analytics, logging, notifications
- **Resource-Intensive Tasks** - Video processing, image optimization

### ❌ Not Suitable For:

- **Real-Time Operations** - Payment processing, login
- **User-Blocking Actions** - Form submissions expecting immediate response
- **Time-Sensitive Data** - Stock prices, live scores

### Example Scenarios:

```javascript
// Scenario 1: Report generation ✅
app.post(
  "/api/reports/generate",
  controlPlane.middleware("/api/reports/generate"),
  async (req, res) => {
    // Can defer - user doesn't need immediate result
  },
);

// Scenario 2: Data export ✅
app.post(
  "/api/export/users",
  controlPlane.middleware("/api/export/users"),
  async (req, res) => {
    // Can defer - send email when complete
  },
);

// Scenario 3: Payment processing ❌
app.post(
  "/api/payment",
  // Do NOT defer payments - must process immediately
  async (req, res) => {
    await processPayment(req.body);
  },
);
```

---

## How AI Decides to Queue

The AI Control Plane analyzes request patterns to determine when to defer requests:

### Decision Factors:

1. **Current System Load**
   - CPU utilization
   - Memory usage
   - Request queue length

2. **Endpoint Characteristics**
   - Historical processing time
   - Resource requirements
   - Criticality

3. **Traffic Patterns**
   - Current request rate
   - Time of day
   - Recent error rates

4. **Request Priority**
   - Priority header
   - Tenant tier
   - SLA requirements

---

## SDK Integration

### Basic Setup

```javascript
import ControlPlaneSDK from "@ayushsoni12/ai-control-plane";

const controlPlane = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY,
  tenantId: process.env.TENANT_ID,
  serviceName: "my-service",
  controlPlaneUrl: process.env.CONTROL_PLANE_URL,
});

app.post(
  "/api/generate-report",
  controlPlane.middleware("/api/generate-report"),
  async (req, res) => {
    // Check if request should be queued
    if (req.controlPlane.isQueueDeferral) {
      // User creates and manages job ID
      const jobId = generateJobId();
      await createJob(jobId, req.body);

      return res.status(202).json({
        message: "Report generation queued",
        jobId: jobId,
        estimatedWait: req.controlPlane.estimatedDelay,
        statusUrl: `/api/jobs/${jobId}/status`,
      });
    }

    // Process immediately
    const report = await generateReport(req.body);
    res.json({ report });
  },
);
```

### Available SDK Properties

```javascript
req.controlPlane = {
  // Queue deferral
  isQueueDeferral: boolean,     // Should request be queued?

  // Metadata
  estimatedDelay: number,       // Estimated wait in seconds
  retryAfter: number,
  statusCode: number,
  reason: string,

  // Full config (if needed)
  config: { ... }
}
```

---

## Response Patterns

### Pattern 1: Accepted with Job ID

```javascript
app.post(
  "/api/export",
  controlPlane.middleware("/api/export"),
  async (req, res) => {
    if (req.controlPlane.isQueueDeferral) {
      // Create job with your own ID
      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await createJob({
        id: jobId,
        type: "export",
        data: req.body,
        createdAt: new Date(),
      });

      return res.status(202).json({
        status: "accepted",
        message: "Export queued for processing",
        jobId,
        statusUrl: `/api/jobs/${jobId}/status`,
        resultUrl: `/api/jobs/${jobId}/result`,
        estimatedWait: req.controlPlane.estimatedDelay,
      });
    }

    const result = await processExport(req.body);
    res.json(result);
  },
);
```

### Pattern 2: Webhook Notification

```javascript
app.post(
  "/api/process-video",
  controlPlane.middleware("/api/process-video"),
  async (req, res) => {
    if (req.controlPlane.isQueueDeferral) {
      const jobId = generateJobId();

      // Store job with webhook URL
      await createJob({
        id: jobId,
        type: "video-processing",
        data: req.body,
        webhookUrl: req.body.webhookUrl,
      });

      return res.status(202).json({
        message: "Video processing queued",
        jobId,
        notification: "We'll notify your webhook when complete",
      });
    }

    const result = await processVideo(req.body);
    res.json(result);
  },
);
```

### Pattern 3: Email Notification

```javascript
app.post(
  "/api/bulk-operation",
  controlPlane.middleware("/api/bulk-operation"),
  async (req, res) => {
    if (req.controlPlane.isQueueDeferral) {
      const jobId = generateJobId();

      // Queue job to send email when done
      await queueJob({
        id: jobId,
        operation: req.body.operation,
        userEmail: req.user.email,
        notifyOnComplete: true,
      });

      return res.status(202).json({
        message: "Operation queued",
        jobId,
        estimatedWait: req.controlPlane.estimatedDelay,
        notification: `We'll email ${req.user.email} when complete`,
      });
    }

    const result = await performBulkOperation(req.body);
    res.json(result);
  },
);
```

---

## Job Status Endpoint

Provide a status endpoint for queued jobs:

```javascript
// GET /api/jobs/:jobId/status
app.get("/api/jobs/:jobId/status", async (req, res) => {
  const job = await getJobStatus(req.params.jobId);

  res.json({
    jobId: job.id,
    status: job.status, // queued, processing, completed, failed
    progress: job.progress, // 0-100
    estimatedCompletion: job.estimatedCompletion,
    result: job.status === "completed" ? job.result : null,
    error: job.status === "failed" ? job.error : null,
  });
});

// GET /api/jobs/:jobId/result
app.get("/api/jobs/:jobId/result", async (req, res) => {
  const job = await getJob(req.params.jobId);

  if (job.status !== "completed") {
    return res.status(200).json({
      status: job.status,
      message: "Job not yet completed",
      checkAgainIn: 30,
    });
  }

  res.json(job.result);
});
```

---

## Client-Side Polling

Example client implementation for polling job status:

```javascript
// Client-side: Poll for job completion
async function pollJobStatus(jobId) {
  const maxAttempts = 60;
  const pollInterval = 5000; // 5 seconds

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`/api/jobs/${jobId}/status`);
    const job = await response.json();

    console.log(`Job ${jobId}: ${job.status} (${job.progress}%)`);

    if (job.status === "completed") {
      return job.result;
    }

    if (job.status === "failed") {
      throw new Error(job.error);
    }

    await sleep(pollInterval);
  }

  throw new Error("Job timeout");
}

// Usage
const result = await pollJobStatus("job-abc123");
console.log("Job complete:", result);
```

---

## Best Practices

### ✅ DO

1. **Use HTTP 202 Accepted**

   ```javascript
   if (req.controlPlane.isQueueDeferral) {
     return res.status(202).json({...}); // Correct status code
   }
   ```

2. **Provide Job Status Endpoint**

   ```javascript
   return res.json({
     jobId: jobId,
     statusUrl: `/api/jobs/${jobId}/status`,
   });
   ```

3. **Set Realistic Estimates**

   ```javascript
   return res.json({
     estimatedWait: req.controlPlane.estimatedDelay,
     note: "Estimate may vary based on current load",
   });
   ```

4. **Implement Notifications**
   ```javascript
   // Email, webhook, or push notification when job completes
   await sendJobCompleteNotification(userId, jobId, result);
   ```

### ❌ DON'T

1. **Don't Queue Critical Operations**

   ```javascript
   // BAD: Never queue payments or auth
   app.post('/api/payment',
     controlPlane.middleware('/api/payment'), // DON'T DO THIS
     async (req, res) => {
       if (req.controlPlane.isQueueDeferral) {
         return res.status(202).json({...}); // NEVER defer payments!
       }
     }
   );
   ```

2. **Don't Use Wrong Status Codes**

   ```javascript
   // BAD
   return res.status(200).json({ queued: true });

   // GOOD
   return res.status(202).json({ queued: true });
   ```

3. **Don't Lose Job Data**

   ```javascript
   // BAD: Job data only in memory
   const jobs = {}; // Lost on restart

   // GOOD: Persist to database or Redis
   await db.jobs.create({ id: jobId, data: req.body });
   ```

---

## Related Features

- 📖 [Load Shedding](./LOAD_SHEDDING.md) - Graceful degradation
- 📖 [Rate Limiting](./RATE_LIMITING.md) - Request throttling
- 📖 [AI Decisions](./AI_DECISIONS.md) - How AI decides to queue

---

## Summary

Queue deferral with AI Control Plane:

- ✅ Automatic queue management
- ✅ Priority-based ordering
- ✅ Job status tracking
- ✅ Real-time monitoring via SSE
- ✅ HTTP 202 standards-compliant
- ✅ Easy SDK integration

**Next:** Learn about [AI Decisions](./AI_DECISIONS.md) to understand how the AI engine works.
