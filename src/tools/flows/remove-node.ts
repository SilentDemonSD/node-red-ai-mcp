import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { mutateFlow } from "./mutation-utils.js";

export function registerRemoveNodeTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-flows-remove-node",
    {
      title: "Remove Node from Flow",
      description: "Remove a single node from a flow tab. Cleans up wire references from all remaining nodes.",
      inputSchema: z.object({
        flowId: z.string().describe("ID of the target flow tab"),
        nodeId: z.string().describe("ID of the node to remove"),
        expectedRev: z.string().optional().describe("Optional revision guard for conflict detection"),
      }),
    },
    async (args) => {
      let removedName = "";
      let wiresCleaned = 0;

      return mutateFlow(client, args.flowId, args.expectedRev, (flow) => {
        const idx = flow.nodes.findIndex((n) => n.id === args.nodeId);
        if (idx === -1) {
          throw new Error(`Node "${args.nodeId}" not found in flow "${args.flowId}"`);
        }

        removedName = (flow.nodes[idx] as Record<string, unknown>).name as string || flow.nodes[idx].type;

        flow.nodes.splice(idx, 1);

        for (const node of flow.nodes) {
          if (Array.isArray(node.wires)) {
            for (const port of node.wires) {
              if (Array.isArray(port)) {
                for (let wi = port.length - 1; wi >= 0; wi--) {
                  if (port[wi] === args.nodeId) {
                    port.splice(wi, 1);
                    wiresCleaned++;
                  }
                }
              }
            }
          }
        }

        return flow;
      }).then(({ result }) => ({
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { status: "node-removed", nodeId: args.nodeId, name: removedName, wiresCleaned, result },
              null,
              2
            ),
          },
        ],
      }));
    }
  );
}
