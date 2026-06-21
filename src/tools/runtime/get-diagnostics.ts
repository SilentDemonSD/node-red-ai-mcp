import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerGetDiagnosticsTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-runtime-get-diagnostics",
    {
      title: "Get Runtime Diagnostics",
      description: "Read Node-RED runtime diagnostics",
      inputSchema: z.object({}),
    },
    async () => {
      const diagnostics = await client.getDiagnostics();
      return { content: [{ type: "text", text: JSON.stringify(diagnostics, null, 2) }] };
    }
  );
}
