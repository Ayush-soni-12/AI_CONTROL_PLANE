# Demo Service

## Overview

The demo service is a Node.js Express application that simulates microservice traffic and behavior governed by NeuralControl. It includes test scripts for verifying adaptive timeouts, circuit breaking, caching, and rate limiting.

## Key files

| File | Owns |
|---|---|
| server.js | Main Express server simulating target workloads |
| test-adaptive-timeout.js | Verification script for adaptive timeout protection |
| test-circuit-breaker.sh | Load test script for circuit breaker behavior |

## Commands

```bash
# Start demo server
node server.js

# Test circuit breaker behavior
bash test-circuit-breaker.sh
```

## Conventions

- Keep test scripts isolated and runnable against a live control plane instance.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
