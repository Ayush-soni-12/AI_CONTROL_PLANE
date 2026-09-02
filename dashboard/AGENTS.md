# Dashboard

## Overview

The dashboard is a Next.js 16 frontend that provides a real time visual view of NeuralControl. It displays system performance, latency metrics, active incidents, feature flags, and confidential agentic payment earnings.

## Key files

| File | Owns |
|---|---|
| app/page.tsx | Main dashboard home page with metrics summary |
| app/layout.tsx | Root layout component with React Query and UI providers |
| components/StatusBadge.tsx | Status indicator badge for service health and consumed states |
| package.json | Frontend dependencies and script definitions |

## Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build production bundle
npm run build
```

## Conventions

- Use React 19 server and client components appropriately with App Router structure.
- Utilize Tailwind CSS for styling with class variance authority and clean component design.
- Handle Web3 wallet interactions using Ethers.js helper modules.

## Gotchas

- StatusBadge component must handle consumed status cleanly to avoid Vercel build type errors.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
