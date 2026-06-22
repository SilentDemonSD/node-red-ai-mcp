import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { mutateFlow } from "./mutation-utils.js";

export function registerRewireNodeTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-flows-rewire-node",
    {
      title: "Rewire Node",
      description: "Replace wire connections for a specific node in a flow tab. Validates all target IDs exist in the flow.",
      inputSchema: z.object({
        flowId: z.string().describe("ID of the target flow tab"),
        nodeId: z.string().describe("ID of the node to rewire"),
        wires: z.array(z.array(z.string())).describe("New wire connections as an array of port arrays"),
        expectedRev: z.string().optional().describe("Optional revision guard for conflict detection"),
      }),
    },
    async (args) => {
      return mutateFlow(client, args.flowId, args.expectedRev, (flow) => {
        const node = flow.nodes.find((n) => n.id === args.nodeId);
        if (!node) {
          throw new Error(`Node "${args.nodeId}" not found in flow "${args.flowId}"`);
        }

        const existingIds = new Set(flow.nodes.map((n) => n.id));
        for (const port of args.wires) {
          for (const tid of port) {
            if (!existingIds.has(tid)) {
              throw new Error(`Wire target "${tid}" does not exist in flow "${args.flowId}"`);
            }
          }
        }

        node.wires = args.wires;
        return flow;
      }).then(({ result }) => ({
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { status: "node-rewired", nodeId: args.nodeId, wires: args.wires, wireCount: args.wires.length, result },
              null,
              2
            ),
          },
        ],
      }));
    }
  );
}
