# MCP Server

## Overview

The MCP server provides a Model Context Protocol interface for AI agents to interact with NeuralControl. It exposes tools for checking traffic decision policies, processing 402 payment invoices, and managing confidential token transactions.

## Key files

| File | Owns |
|---|---|
| server.py | Main FastMCP server definition and tool functions |
| pyproject.toml | Python package configuration and dependencies |

## Commands

```bash
# Run MCP server locally
python server.py
```

## Conventions

- Keep tool response payloads compact and human readable for LLM consumers.
- Use explicit error messages when control plane API calls fail.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
