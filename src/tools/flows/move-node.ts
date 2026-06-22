import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { mutateFlow } from "./mutation-utils.js";

export function registerMoveNodeTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-flows-move-node",
    {
      title: "Move Node",
      description: "Move a single node to a specific visual position (x, y) within a flow tab.",
      inputSchema: z.object({
        flowId: z.string().describe("ID of the target flow tab"),
        nodeId: z.string().describe("ID of the node to move"),
        x: z.number().describe("New X position"),
        y: z.number().describe("New Y position"),
        expectedRev: z.string().optional().describe("Optional revision guard for conflict detection"),
      }),
    },
    async (args) => {
      return mutateFlow(client, args.flowId, args.expectedRev, (flow) => {
        const node = flow.nodes.find((n) => n.id === args.nodeId);
        if (!node) {
          throw new Error(`Node "${args.nodeId}" not found in flow "${args.flowId}"`);
        }

        node.x = args.x;
        node.y = args.y;
        return flow;
      }).then(({ result }) => ({
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { status: "node-moved", nodeId: args.nodeId, x: args.x, y: args.y, result },
              null,
              2
            ),
          },
        ],
      }));
    }
  );
}
