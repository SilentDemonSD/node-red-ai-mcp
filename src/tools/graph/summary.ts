import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { buildGraph } from "../../graph/engine.js";
import { summarizeGraph } from "../../graph/search.js";

export function registerSummaryTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-graph-summary",
    {
      title: "Flow Summary",
      description: "Return a compact semantic summary for a flow or the whole runtime",
      inputSchema: z.object({ flowId: z.string().optional() }),
    },
    async (args) => {
      const raw = await client.getFlows();
      const graph = buildGraph(raw);
      const summary = summarizeGraph(graph);
      const focusTab = args.flowId ? graph.tabs.find((t) => t.id === args.flowId || t.label === args.flowId) : null;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ...summary, focusTab: focusTab ?? null }, null, 2),
          },
        ],
      };
    }
  );
}
