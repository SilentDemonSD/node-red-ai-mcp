import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerGetSchemeTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-auth-get-scheme",
    {
      title: "Get Auth Scheme",
      description: "Inspect the active Node-RED admin auth scheme",
      inputSchema: z.object({}),
    },
    async () => {
      const scheme = await client.getAuthScheme();
      return { content: [{ type: "text", text: JSON.stringify(scheme, null, 2) }] };
    }
  );
}
