import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { buildGraph } from "../../graph/engine.js";
import { buildSemanticIndex, collectRelevantSubgraph } from "../../graph/search.js";

export function registerPackTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-graph-pack",
    {
      title: "Graph Pack",
      description: "Return a compact context pack with semantic search and neighborhood expansion",
      inputSchema: z.object({
        query: z.string(),
        flowId: z.string().optional(),
        maxMatches: z.number().int().min(1).optional().default(8),
        maxNeighbors: z.number().int().min(0).optional().default(1),
      }),
    },
    async (args) => {
      const raw = await client.getFlows();
      const graph = buildGraph(raw);
      const index = buildSemanticIndex(graph);
      const pack = collectRelevantSubgraph(graph, index, args.query, {
        maxMatches: args.maxMatches,
        maxNeighbors: args.maxNeighbors,
      });
      return { content: [{ type: "text", text: JSON.stringify(pack, null, 2) }] };
    }
  );
}
