import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerToggleSetTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-nodes-toggle-set",
    {
      title: "Toggle Node Set",
      description: "Enable or disable a node set within a module",
      inputSchema: z.object({
        module: z.string(),
        set: z.string(),
        enabled: z.boolean(),
      }),
    },
    async (args) => {
      const result = await client.toggleNodeSet(args.module, args.set, args.enabled);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
