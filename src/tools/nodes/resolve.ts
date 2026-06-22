import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { lookupInRegistry, getRegistryForFlow } from "../../graph/registry.js";

export function registerResolveNodeTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-nodes-resolve",
    {
      title: "Resolve Node",
      description: "Look up node IDs by name, type, or description using the node registry. Returns matching nodes with their IDs, types, and flow context.",
      inputSchema: z.object({
        query: z.string().optional().default("").describe("Search query (matches node name, type, flow label, or ID)"),
        flowId: z.string().optional().describe("Optional flow ID filter to scope the search"),
        flowLabel: z.string().optional().describe("Optional flow label filter (exact match)"),
      }),
    },
    async (args) => {
      const q = args.query || "";
      let results: import("../../graph/registry.js").RegistryEntry[];

      if (args.flowLabel) {
        results = getRegistryForFlow(args.flowLabel);
        if (q) {
          results = results.filter(
            (e) =>
              e.name.toLowerCase().includes(q.toLowerCase()) ||
              e.type.toLowerCase().includes(q.toLowerCase()) ||
              e.id.toLowerCase() === q.toLowerCase()
          );
        }
      } else if (q) {
        results = lookupInRegistry(q, args.flowId);
      } else {
        results = [];
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ query: q, matches: results }, null, 2),
          },
        ],
      };
    }
  );
}
