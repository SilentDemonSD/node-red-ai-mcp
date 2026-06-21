import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerGetSettingsTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-runtime-get-settings",
    {
      title: "Get Runtime Settings",
      description: "Read Node-RED runtime settings",
      inputSchema: z.object({}),
    },
    async () => {
      const settings = await client.getSettings();
      return { content: [{ type: "text", text: JSON.stringify(settings, null, 2) }] };
    }
  );
}
