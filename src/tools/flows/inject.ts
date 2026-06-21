import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerInjectTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-inject",
    {
      title: "Inject",
      description: "Trigger an inject node by its ID",
      inputSchema: z.object({
        nodeId: z.string().describe("ID of the inject node to trigger"),
      }),
    },
    async (args) => {
      const result = await client.inject(args.nodeId);
      return { content: [{ type: "text", text: JSON.stringify(result ?? { status: "injected" }, null, 2) }] };
    }
  );
}
