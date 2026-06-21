import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerRevokeTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-auth-revoke",
    {
      title: "Revoke Token",
      description: "Revoke a Node-RED bearer token",
      inputSchema: z.object({
        token: z.string().optional(),
      }),
    },
    async (args) => {
      try {
        const result = await client.revoke(args.token);
        return { content: [{ type: "text", text: JSON.stringify(result || { revoked: true }) }] };
      } catch (error) {
        const msg = String((error as Error).message ?? "");
        if (msg.includes("Cannot POST /auth/revoke") || msg.includes("status 404")) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "POST /auth/revoke not available", details: msg }) }],
            isError: true,
          };
        }
        throw error;
      }
    }
  );
}
