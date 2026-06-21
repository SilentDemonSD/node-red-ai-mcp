import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { buildGraph, collectClosure } from "../../graph/engine.js";

export function registerDependenciesTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-graph-dependencies",
    {
      title: "Graph Dependencies",
      description: "Resolve upstream and downstream dependencies for a node",
      inputSchema: z.object({
        flowId: z.string(),
        nodeId: z.string(),
      }),
    },
    async (args) => {
      const raw = await client.getFlows();
      const graph = buildGraph(raw);
      const upstream = collectClosure(graph.reverseAdjacency as unknown as Map<string, string[] | Set<string>>, args.nodeId);
      const downstream = collectClosure(graph.adjacency, args.nodeId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ flowId: args.flowId, nodeId: args.nodeId, upstream, downstream }, null, 2),
          },
        ],
      };
    }
  );
}
