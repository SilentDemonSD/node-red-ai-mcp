import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { buildGraph } from "../../graph/engine.js";
import { recordSnapshot } from "./snapshots.js";

export function registerUpdateFlowTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-flows-update",
    {
      title: "Update Flow",
      description: "Replace a flow tab with a new document",
      inputSchema: z.object({
        id: z.string(),
        label: z.string().optional(),
        nodes: z.array(z.record(z.string(), z.unknown())),
        expectedRev: z.string().optional(),
      }),
    },
    async (args) => {
      const existing = await client.getFlow(args.id);
      if (args.expectedRev) {
        const current = await client.getFlows();
        const rev = buildGraph(current).rev;
        if (rev && rev !== args.expectedRev) {
          throw new Error(`Revision conflict: expected ${args.expectedRev}, current ${rev}`);
        }
      }
      const updated = {
        ...existing,
        id: existing.id ?? args.id,
        label: args.label ?? existing.label,
        nodes: args.nodes,
      } as unknown as typeof existing;
      const flows = await client.getFlows();
      recordSnapshot(args.id, existing, buildGraph(flows).rev);
      const result = await client.updateFlow(args.id, updated);
      return { content: [{ type: "text", text: JSON.stringify({ status: "updated", result }, null, 2) }] };
    }
  );
}
