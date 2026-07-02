# Changelog

All notable changes to the `@neuralcontrol/payments-lite` SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-07-01

### ✨ Added
- **Decentralized Reputation Support (ERC-8004)**: Added `getAgentScore(agentId)` function to check an agent's on-chain trust score.
- **Slashing Mechanism**: Added `slashAgentScore(agentId, evidenceHash)` function to allow independent websites to autonomously penalize malicious agents on the Avalanche blockchain by providing cryptographic proof.
- **Improved Documentation**: Extensive updates to `README.md` with fully functional examples of the slashing API and gas fee explanations.

---

## [1.0.0] - 2026-06-25

### ✨ Added
- Initial release.
- `verifyOnChain` function for validating Avalanche Fuji transaction hashes for autonomous AI payments.
