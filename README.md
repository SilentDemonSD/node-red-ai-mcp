<p align="center">
  <img alt="node-red-mcp" src="docs/node-red-ai-mcp.png" width="60%">
</p>

<div align="center">

[![npm version](https://img.shields.io/npm/v/@mysterysd/node-red-mcp?color=%238F00FF&logo=npm)](https://www.npmjs.com/package/@mysterysd/node-red-mcp)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/types-%3E%205.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/mysterysd/node-red-mcp/pulls)

**A production-ready [MCP](https://modelcontextprotocol.io) server that connects AI assistants (Claude, Copilot, etc.) to the [Node-RED](https://nodered.org/) Admin API.**

Inspect flows, manage nodes, analyze graph topology, capture debug output, apply JSON patches, and rollback changes — all through natural language.

</div>

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [Usage](#usage)
  - [Debug Capture](#debug-capture)
  - [Transport Modes](#transport-modes)
- [Tools Reference](#tools-reference)
  - [Auth](#auth)
  - [Runtime](#runtime)
  - [Flows](#flows)
  - [Graph](#graph)
  - [Nodes](#nodes)
- [Resources](#resources)
- [Prompts](#prompts)
- [Client Library](#client-library)
- [Graph Engine](#graph-engine)
- [Development](#development)
- [Docker](#docker)
- [License](#license)

---

## Features

- 🚀 **3 Transport Modes** — stdio (default), SSE, streamable HTTP
- 🔌 **31 MCP Tools** — full coverage of flows, nodes, runtime, auth, inject, graph analysis, and debug capture
- 📊 **Graph Engine** — auto-builds directed acyclic graph (DAG) from flow topology, detects cycles, sources, sinks, and computes node categories
- 🔍 **Semantic Search** — query flows by node name, type, topic, URL, or any metadata
- 🐛 **Live Debug Capture** — WebSocket-based capture of Node-RED debug output, combined with inject or standalone
- 🔧 **JSON Patch** — RFC 6902 compliant patch engine for incremental flow edits
- 📸 **Snapshots** — in-memory 20-entry ring buffer per flow for rollback
- 🔗 **6 Resources + 3 Prompts** — inspect runtime settings, diagnostics, flows, and get AI-assisted analysis

## Installation

```bash
npm install -g @mysterysd/node-red-mcp
```

Or run directly without installing:

```bash
npx @mysterysd/node-red-mcp
```

### Prerequisites

- **Node.js** >= 18
- **Node-RED** instance running with the [Admin API](https://nodered.org/docs/api/admin/) enabled (default: `http://localhost:1880`)

## Quick Start

```bash
# 1. Set your Node-RED URL (default: http://localhost:1880)
export NODE_RED_URL=http://my-nodered:1880

# 2. Start the MCP server in stdio mode
npx @mysterysd/node-red-mcp
```

Then configure your MCP client (Claude Desktop, VS Code, etc.):

```json
{
  "mcpServers": {
    "node-red": {
      "command": "npx",
      "args": ["@mysterysd/node-red-mcp"],
      "env": {
        "NODE_RED_URL": "http://localhost:1880",
        "NODE_RED_ACCESS_TOKEN": "your-token"
      }
    }
  }
}
```

## Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|---|---|---|
| `NODE_RED_URL` | `http://localhost:1880` | Base URL of the Node-RED Admin API |
| `NODE_RED_TOKEN` | — | Bearer token for API auth (takes precedence over `NODE_RED_ACCESS_TOKEN`) |
| `NODE_RED_ACCESS_TOKEN` | — | Alternative name for the bearer token |
| `NODE_RED_USERNAME` | — | Username for password-based auth |
| `NODE_RED_PASSWORD` | — | Password for password-based auth |
| `MCP_SERVER_PORT` | `3001` (SSE), `3002` (streamable HTTP) | HTTP server port for HTTP transports |
| `PORT` | `3001` (SSE), `3002` (streamable HTTP) | Fallback port (overridden by `MCP_SERVER_PORT`) |

## Authentication

The server supports two auth methods:

1. **Token-based** (recommended):
   ```bash
   export NODE_RED_TOKEN="your-bearer-token"
   # or: export NODE_RED_ACCESS_TOKEN="your-bearer-token"
   ```

2. **Password-based** (auto-login on first request):
   ```bash
   export NODE_RED_USERNAME="admin"
   export NODE_RED_PASSWORD="your-password"
   ```

If neither is set, the server will attempt unauthenticated requests (Node-RED's default for local-only deployments).

> 💡 Copy `.env.example` to `.env` as a reference for all available environment variables. Use `MCP_SERVER_PORT` to control the HTTP server port.

## Usage

```bash
# stdio mode (default — for Claude Desktop, VS Code, etc.)
node-red-mcp
node-red-mcp stdio

# SSE mode (HTTP server on :3001)
node-red-mcp sse

# Streamable HTTP mode (HTTP server on :3002)
node-red-mcp streamableHttp
```

### Debug Capture

Two tools provide real-time debug output capture via Node-RED WebSocket (`/comms`):

| Tool | Description |
|---|---|
| `node-red-inject` (with `waitForDebug`) | Inject + capture — fires inject, listens, returns both result and debug messages in one call |
| `node-red-debug-listen` | Standalone listener — connects, subscribes to `debug`, captures messages for N seconds with optional node/flow filtering |

**Example** (one-call inject + verify):
```
node-red-inject({ nodeId: "my-inject", waitForDebug: 5 })
→ { status: "injected", debug: [...], debugCount: 3 }
```

Both tools handle Node-RED's array-batched WebSocket format automatically.

### Transport Modes

| Mode | Protocol | Best For |
|---|---|---|
| `stdio` | stdin/stdout JSON-RPC | Claude Desktop, VS Code MCP extensions |
| `sse` | Server-Sent Events | Remote or containerized setups |
| `streamableHttp` | HTTP POST + DELETE | Stateless proxies, load-balanced deployments |

## Tools Reference

All 31 tools are registered with the MCP server. Each returns JSON output.

### Auth

| Tool | Description |
|---|---|
| `node-red-auth-get-scheme` | Inspect the active Node-RED admin auth scheme |
| `node-red-auth-login` | Exchange credentials for a bearer token |
| `node-red-auth-revoke` | Revoke an existing bearer token |

### Runtime

| Tool | Description |
|---|---|
| `node-red-runtime-get-settings` | Read runtime settings |
| `node-red-runtime-get-diagnostics` | Read runtime diagnostics |
| `node-red-runtime-get-flow-state` | Read runtime flow state |
| `node-red-runtime-set-flow-state` | Update runtime flow state |
| `node-red-debug-listen` | Capture debug messages via WebSocket for a duration (optionally filtered by node/flow) |

### Flows

| Tool | Description |
|---|---|
| `node-red-flows-list` | List active flow tabs and metadata |
| `node-red-flows-get` | Get a single flow by id or label |
| `node-red-flows-create` | Create a new flow tab with nodes (auto-generates IDs, remaps wires) |
| `node-red-flows-update` | Replace an existing flow tab |
| `node-red-flows-patch` | Apply JSON Patch (RFC 6902) operations to a flow |
| `node-red-flows-delete` | Delete a flow tab |
| `node-red-flows-clone` | Clone an existing flow tab |
| `node-red-flows-rollback` | Rollback a flow to a previous snapshot |
| `node-red-inject` | Trigger an inject node by its ID (optionally `waitForDebug` to capture debug output in one call) |

### Graph

| Tool | Description |
|---|---|
| `node-red-graph-analyze` | Analyze topology, dependencies, and graph health |
| `node-red-graph-summary` | Summary statistics and risk assessment |
| `node-red-graph-visualize` | Generate a human-readable graph view |
| `node-red-graph-dependencies` | Resolve upstream and downstream dependencies for a node |
| `node-red-graph-query` | Search nodes by semantic query |
| `node-red-graph-pack` | Context pack for semantic search with neighbor expansion |
| `node-red-graph-export` | Export the full flow graph in serializable format |

### Nodes

| Tool | Description |
|---|---|
| `node-red-nodes-list` | List installed node modules and node sets |
| `node-red-nodes-install` | Install a node module from npm |
| `node-red-nodes-get-module` | Inspect a specific node module |
| `node-red-nodes-toggle-module` | Enable or disable a node module |
| `node-red-nodes-remove-module` | Remove a node module |
| `node-red-nodes-get-set` | Inspect a specific node set within a module |
| `node-red-nodes-toggle-set` | Enable or disable a node set |

## Resources

| URI | Description |
|---|---|
| `node-red://runtime/settings` | Current runtime settings (JSON) |
| `node-red://runtime/diagnostics` | Runtime diagnostics (JSON) |
| `node-red://flows` | All active flows (raw JSON) |
| `node-red://nodes` | All installed nodes (JSON) |
| `node-red://graph` | Full graph snapshot (serializable format) |
| `node-red://flow/{id}` | Single flow by ID (template) |

## Prompts

| Prompt | Description |
|---|---|
| `analyze-flow` | Analyze a flow for risks, dependencies, and graph structure |
| `repair-flow` | Draft a repair plan for invalid or broken flow wiring |
| `refactor-flow` | Suggest a graph-aware refactor plan for a flow |

## Client Library

The client library (`src/client/index.ts`) provides a standalone `NodeRedClient` class you can use programmatically:

```typescript
import { NodeRedClient } from "@mysterysd/node-red-mcp/client";

const client = new NodeRedClient({
  baseUrl: "http://localhost:1880",
  accessToken: process.env.NODE_RED_ACCESS_TOKEN,
});

// List all flows
const flows = await client.getFlows();

// Get a specific flow
const flow = await client.getFlow("flow-id");

// Install a node
await client.installNode({ module: "node-red-contrib-something" });
```

### API

```typescript
class NodeRedClient {
  baseUrl: string;                         // Public getter (for WebSocket URL construction)
  constructor(options: ClientOptions);

  // Auth
  getAuthScheme(): Promise<AuthScheme>;
  login(credentials?: AuthCredentials): Promise<TokenResponse>;
  revoke(token?: string): Promise<unknown>;

  // Runtime
  getSettings(): Promise<Record<string, unknown>>;
  getDiagnostics(): Promise<Record<string, unknown>>;
  getFlowState(): Promise<unknown>;
  setFlowState(state: unknown): Promise<unknown>;

  // Flows
  getFlows(): Promise<FlowsResponse>;
  getFlow(id: string): Promise<FlowDocument>;
  createFlow(flow: FlowDocument): Promise<FlowDocument>;
  updateFlow(id: string, flow: FlowDocument): Promise<FlowDocument>;
  deleteFlow(id: string): Promise<unknown>;

  // Nodes
  listNodes(): Promise<unknown>;
  installNode(payload: Record<string, unknown>): Promise<unknown>;
  getNodeModule(module: string): Promise<unknown>;
  toggleNodeModule(module: string, enabled: boolean): Promise<unknown>;
  removeNodeModule(module: string): Promise<unknown>;
  getNodeSet(module: string, set: string): Promise<unknown>;
  toggleNodeSet(module: string, set: string, enabled: boolean): Promise<unknown>;

  // Flow State
  getFlowState(): Promise<unknown>;
  setFlowState(state: unknown): Promise<unknown>;

  // Inject
  inject(nodeId: string): Promise<unknown>;
}
```

## Graph Engine

The graph engine (`src/graph/`) is a standalone library for building and analyzing Node-RED flow topologies:

```typescript
import { buildGraph, formatGraph } from "@mysterysd/node-red-mcp/graph/engine";
import { queryGraph } from "@mysterysd/node-red-mcp/graph/search";
import { applyPatch } from "@mysterysd/node-red-mcp/graph/patch";
```

### Graph Types

```typescript
interface FlowGraph {
  rev: string;
  tabs: FlowTab[];
  nodes: FlowNode[];
  nodeById: Map<string, FlowNode>;
  adjacency: Map<string, string[]>;       // forward edges
  reverseAdjacency: Map<string, Set<string>>; // backward edges
  edges: GraphEdge[];
  sources: string[];      // nodes with 0 in-degree
  sinks: string[];        // nodes with 0 out-degree
  cycles: string[][];     // detected cycles
  categories: Map<string, NodeCategory>;
}
```

### Functions

| Function | Description |
|---|---|
| `buildGraph(flowsResponse)` | Build a `FlowGraph` from raw Node-RED API response |
| `categorizeNode(node)` | Classify node as trigger, sink, transform, subflow, config, or other |
| `isConfigNode(node)` | Check if a node is a config node (no position, no wires) |
| `collectClosure(map, start)` | BFS/DFS from a start node to collect all reachable nodes |
| `graphToSerializable(graph)` | Convert graph to plain JSON-safe format |
| `formatGraph(graph, focusId?)` | Produce a human-readable topology view |
| `findCycles(adjacency)` | Detect all cycles in a directed graph |
| `buildSemanticIndex(graph)` | Build a searchable text index over all nodes |
| `queryGraph(graph, query, flowId?)` | Search nodes by semantic query (returns scored results) |
| `collectRelevantSubgraph(graph, index, query, opts)` | Find matching nodes + expand to neighbors |
| `summarizeGraph(graph)` | Generate a summary with counts, categories, risky nodes |
| `applyPatch(document, operations)` | Apply RFC 6902 JSON Patch operations |

## Development

```bash
# Clone and install
git clone https://github.com/mysterysd/node-red-mcp.git
cd node-red-mcp
npm install

# Build
npm run build

# Watch mode
npm run watch

# Test (with coverage)
npm test

# Lint
npm run prettier:check
npm run prettier:fix
```

### Project Structure

```
src/
├── config.ts        # Centralized env var config (NODE_RED_URL, NODE_RED_TOKEN, MCP_SERVER_PORT)
├── client/          # NodeRedClient — Admin API wrapper (baseUrl public getter)
├── graph/           # Standalone graph engine (types, engine, search, patch)
├── tools/
│   ├── auth/        # get-scheme, login, revoke
│   ├── runtime/     # get-settings, get-diagnostics, get-flow-state, set-flow-state, debug-listen
│   ├── flows/       # list, get, create, update, patch, delete, clone, rollback, inject
│   ├── graph/       # analyze, summary, visualize, dependencies, query, pack, export
│   └── nodes/       # list, install, get-module, toggle-module, remove-module, get-set, toggle-set
├── resources/       # 6 MCP resource handlers
├── prompts/         # 3 MCP prompt templates
├── server/          # McpServer factory
├── transports/      # stdio, SSE, streamableHttp
├── __tests__/       # 122 unit tests (15 files), 21 live integration tests
└── index.ts         # CLI entry point
```

## Docker

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3002
ENV NODE_RED_URL=http://nodered:1880
CMD ["node", "dist/index.js", "streamableHttp"]
```

Build and run:

```bash
docker build -t node-red-mcp .
docker run -e NODE_RED_URL=http://host.docker.internal:1880 -p 3002:3002 node-red-mcp
```

## License

[MIT](LICENSE) © Mystery SD
