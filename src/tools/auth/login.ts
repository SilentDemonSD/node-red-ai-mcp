import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerLoginTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-auth-login",
    {
      title: "Login",
      description: "Exchange Node-RED credentials for a bearer token",
      inputSchema: z.object({
        client_id: z.string().optional().default("node-red-admin"),
        grant_type: z.string().optional().default("password"),
        scope: z.string().optional().default("*"),
        username: z.string().optional(),
        password: z.string().optional(),
      }),
    },
    async (args) => {
      const result = await client.login(args);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
