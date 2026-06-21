import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { buildGraph, formatGraph } from "../../graph/engine.js";

export function registerVisualizeTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-graph-visualize",
    {
      title: "Visualize Graph",
      description: "Generate a readable graph topology view",
      inputSchema: z.object({ flowId: z.string().optional() }),
    },
    async (args) => {
      const raw = await client.getFlows();
      const graph = buildGraph(raw);
      return { content: [{ type: "text", text: formatGraph(graph, args.flowId ?? null) }] };
    }
  );
}
