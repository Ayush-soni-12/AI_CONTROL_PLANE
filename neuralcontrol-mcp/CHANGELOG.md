# Changelog

All notable changes to the neuralcontrol-mcp Node.js project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-07-02

### ✨ Added
- Initial release of the `neuralcontrol-mcp` package.
- `pay_402_invoice` tool: Allows AI agents to parse `HTTP 402 Payment Required` responses, autonomously execute blockchain transactions on the Avalanche Fuji network, and seamlessly verify them with the Control Plane API to bypass rate limits.
- Supports both standard verification (`verify_url`) and standalone mode (returns `tx_hash` directly).
- Includes an explicit 3-second network wait to prevent Web3 RPC race conditions during transaction verification.
