import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerGetSetTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-nodes-get-set",
    {
      title: "Get Node Set",
      description: "Inspect a specific node set within a module",
      inputSchema: z.object({
        module: z.string(),
        set: z.string(),
      }),
    },
    async (args) => {
      const result = await client.getNodeSet(args.module, args.set);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
