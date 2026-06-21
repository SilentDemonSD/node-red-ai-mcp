import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { buildGraph } from "../../graph/engine.js";
import { queryGraph } from "../../graph/search.js";

export function registerQueryTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-graph-query",
    {
      title: "Query Graph",
      description: "Semantic search across node names, types, labels, and properties",
      inputSchema: z.object({
        query: z.string(),
        flowId: z.string().optional(),
      }),
    },
    async (args) => {
      const raw = await client.getFlows();
      const graph = buildGraph(raw);
      const results = queryGraph(graph, args.query, args.flowId);
      return { content: [{ type: "text", text: JSON.stringify({ query: args.query, matches: results }, null, 2) }] };
    }
  );
}
