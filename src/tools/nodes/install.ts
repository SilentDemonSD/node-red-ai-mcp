import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerInstallNodeTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-nodes-install",
    {
      title: "Install Node",
      description: "Install a node module in Node-RED",
      inputSchema: z.object({
        module: z.string(),
        version: z.string().optional(),
      }),
    },
    async (args) => {
      const payload: Record<string, unknown> = { module: args.module };
      if (args.version) payload.version = args.version;
      const result = await client.installNode(payload);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
