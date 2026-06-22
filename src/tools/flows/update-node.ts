import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { mutateFlow } from "./mutation-utils.js";

export function registerUpdateNodeTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-flows-update-node",
    {
      title: "Update Node",
      description: "Update specific properties of a single node in a flow tab. Deep-merges the provided properties onto the existing node.",
      inputSchema: z.object({
        flowId: z.string().describe("ID of the target flow tab"),
        nodeId: z.string().describe("ID of the node to update"),
        properties: z.record(z.string(), z.unknown()).describe("Partial node properties to merge onto the existing node"),
        expectedRev: z.string().optional().describe("Optional revision guard for conflict detection"),
      }),
    },
    async (args) => {
      if (!args.properties || typeof args.properties !== "object") {
        throw new Error("'properties' must be a non-null object");
      }

      const changedKeys: string[] = [];

      return mutateFlow(client, args.flowId, args.expectedRev, (flow) => {
        const node = flow.nodes.find((n) => n.id === args.nodeId);
        if (!node) {
          throw new Error(`Node "${args.nodeId}" not found in flow "${args.flowId}"`);
        }

        const oldKeys = new Set(Object.keys(node));

        for (const [key, value] of Object.entries(args.properties)) {
          const oldVal = (node as Record<string, unknown>)[key];
          const oldJson = JSON.stringify(oldVal);
          const newJson = JSON.stringify(value);
          if (oldJson !== newJson) {
            changedKeys.push(key);
          }
          (node as Record<string, unknown>)[key] = value;
        }

        return flow;
      }).then(({ result }) => ({
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { status: "node-updated", nodeId: args.nodeId, changedKeys, result },
              null,
              2
            ),
          },
        ],
      }));
    }
  );
}
