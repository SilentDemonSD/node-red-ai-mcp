import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerGetModuleTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-nodes-get-module",
    {
      title: "Get Node Module",
      description: "Inspect a node module's details",
      inputSchema: z.object({ module: z.string() }),
    },
    async (args) => {
      const result = await client.getNodeModule(args.module);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
