import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerRemoveModuleTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-nodes-remove-module",
    {
      title: "Remove Node Module",
      description: "Remove a node module from Node-RED",
      inputSchema: z.object({ module: z.string() }),
    },
    async (args) => {
      const result = await client.removeNodeModule(args.module);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
