import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { applyPatch } from "../../graph/patch.js";
import { buildGraph } from "../../graph/engine.js";
import type { PatchOperation } from "../../graph/types.js";
import { recordSnapshot } from "./snapshots.js";

export function registerPatchFlowTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-flows-patch",
    {
      title: "Patch Flow",
      description: "Apply JSON patch operations to a flow tab",
      inputSchema: z.object({
        id: z.string(),
        operations: z.array(z.record(z.string(), z.unknown())),
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
      const flows = await client.getFlows();
      recordSnapshot(args.id, existing, buildGraph(flows).rev);
      const patched = applyPatch(existing as Record<string, unknown>, args.operations as unknown as PatchOperation[]);
      const result = await client.updateFlow(args.id, patched as typeof existing);
      return { content: [{ type: "text", text: JSON.stringify({ status: "patched", result }, null, 2) }] };
    }
  );
}
