import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { buildGraph } from "../../graph/engine.js";

export function registerGetFlowTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-flows-get",
    {
      title: "Get Flow",
      description: "Get a single flow tab by id or label",
      inputSchema: z.object({
        idOrLabel: z.string(),
      }),
    },
    async (args) => {
      try {
        const flow = await client.getFlow(args.idOrLabel);
        return { content: [{ type: "text", text: JSON.stringify(flow, null, 2) }] };
      } catch {
        const raw = await client.getFlows();
        const graph = buildGraph(raw);
        const tab = graph.tabs.find((t) => t.label === args.idOrLabel);
        if (!tab) throw new Error(`Flow not found: "${args.idOrLabel}". Provide a valid flow ID or label.`);
        const flow = await client.getFlow(tab.id);
        return { content: [{ type: "text", text: JSON.stringify(flow, null, 2) }] };
      }
    }
  );
}
