import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type NodeRedClient } from "../client/index.js";
import { buildGraph, graphToSerializable } from "../graph/engine.js";

export function registerResources(server: McpServer, client: NodeRedClient): void {
  server.resource(
    "Runtime Settings",
    "node-red://runtime/settings",
    async (uri) => {
      const data = await client.getSettings();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.resource(
    "Runtime Diagnostics",
    "node-red://runtime/diagnostics",
    async (uri) => {
      const data = await client.getDiagnostics();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.resource(
    "Active Flows",
    "node-red://flows",
    async (uri) => {
      const data = await client.getFlows();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.resource(
    "Installed Nodes",
    "node-red://nodes",
    async (uri) => {
      const data = await client.listNodes();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.resource(
    "Graph Snapshot",
    "node-red://graph",
    async (uri) => {
      const raw = await client.getFlows();
      const graph = buildGraph(raw);
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(graphToSerializable(graph), null, 2) }] };
    }
  );

  const flowTemplate = new ResourceTemplate("node-red://flow/{id}", { list: undefined });
  server.resource(
    "Flow by ID",
    flowTemplate,
    async (uri, params) => {
      const flowId = params?.id as string;
      const data = await client.getFlow(flowId);
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
