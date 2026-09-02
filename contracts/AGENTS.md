# Smart Contracts

## Overview

The contracts directory contains Hardhat smart contract suites for Encrypted ERC (eERC) tokens, confidential cAGT earnings, and ZK proof verification on EVM networks.

## Key files

| File | Owns |
|---|---|
| hardhat.config.js | Hardhat network and compiler configuration |
| contracts_src/ | Solidity smart contract source files |
| scripts/ | Deployment and verification scripts |

## Commands

```bash
# Install contract dependencies
npm install

# Compile contracts
npx hardhat compile

# Run contract test suite
npx hardhat test
```

## Conventions

- Ensure all confidential token logic and ZK proof verifications are unit tested before deployment.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
