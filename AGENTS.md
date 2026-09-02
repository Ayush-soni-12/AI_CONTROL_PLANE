# AI Control Plane

## Stack

- **Language / Runtime**: Python 3.11, Node.js 20, TypeScript 5
- **Framework**: FastAPI (control plane), Next.js 16 (dashboard), Express (demo service), Hardhat (contracts)
- **Key dependencies**: Redis, PostgreSQL, RabbitMQ, LangChain, Ethers.js, Tailwind CSS 4
- **Package manager**: npm, pip

## Build approach

- **Tracer Bullet**: vertical end to end slices through control plane, redis, postgresql, and dashboard UI

## Commands

```bash
# Docker setup (recommended)
docker-compose up

# Control plane dev server
cd control-plane && uvicorn app.main:app --reload

# Dashboard dev server
cd dashboard && npm run dev

# Run smart contract tests
cd contracts && npx hardhat test
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`.

## Rules

- Keep global context short and move component details to nested context files.
- Protect core decision pipelines with redis caching and async queue deferral.
- Handle database operations with safe error handling and fallback logic.
- Ensure all public routes enforce rate limits and proper authorization.
- Write clear unit tests for new routers and smart contracts before merging.

## Agent skills

- [architect](.agents/skills/architect/): `jsmastery-pro/skills`, technical design and spec generation
- [audit](.agents/skills/audit/): `jsmastery-pro/skills`, codebase context bootstrapping and audit
- [check](.agents/skills/check/): `jsmastery-pro/skills`, verification and code review driver
- [debug](.agents/skills/debug/): `jsmastery-pro/skills`, root cause investigation and bug fixing
- [develop](.agents/skills/develop/): `jsmastery-pro/skills`, feature implementation driver
- [document](.agents/skills/document/): `jsmastery-pro/skills`, release notes and documentation authoring
- [scope](.agents/skills/scope/): `jsmastery-pro/skills`, product scope and milestone planner
- [sync](.agents/skills/sync/): `jsmastery-pro/skills`, context synchronization and durable knowledge maintenance
- [test](.agents/skills/test/): `jsmastery-pro/skills`, automated test suite creation
Declined: extra stack skills (user opted out of installing extra skills during audit)

## Context files

- [control-plane/AGENTS.md](control-plane/AGENTS.md): FastAPI backend, traffic signals, decision logic, and database migrations
- [dashboard/AGENTS.md](dashboard/AGENTS.md): Next.js 16 frontend, real time metrics dashboard, and Web3 payments UI
- [mcp-server/AGENTS.md](mcp-server/AGENTS.md): FastMCP server exposing control plane tools and confidential invoice billing
- [demo-service/AGENTS.md](demo-service/AGENTS.md): Express service simulating target microservices under traffic loads
- [contracts/AGENTS.md](contracts/AGENTS.md): Hardhat smart contracts for Encrypted ERC tokens and confidential payments

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
