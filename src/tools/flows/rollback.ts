import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { getSnapshots } from "./snapshots.js";

export function registerRollbackFlowTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-flows-rollback",
    {
      title: "Rollback Flow",
      description: "Rollback a flow tab to a previous snapshot",
      inputSchema: z.object({
        id: z.string(),
        snapshotIndex: z.number().int().min(0).optional(),
      }),
    },
    async (args) => {
      const history = getSnapshots(args.id);
      if (history.length === 0) throw new Error(`No rollback snapshot available for ${args.id}`);

      const index = Math.min(args.snapshotIndex ?? history.length - 1, history.length - 1);
      const snapshot = history[index];
      const result = await client.updateFlow(args.id, snapshot.flow);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { status: "rolled-back", snapshotIndex: index, rev: snapshot.rev, timestamp: snapshot.timestamp, result },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
