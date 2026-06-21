import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerToggleModuleTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-nodes-toggle-module",
    {
      title: "Toggle Node Module",
      description: "Enable or disable a node module",
      inputSchema: z.object({
        module: z.string(),
        enabled: z.boolean(),
      }),
    },
    async (args) => {
      const result = await client.toggleNodeModule(args.module, args.enabled);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
