import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerGetFlowTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-flows-get",
    {
      title: "Get Flow",
      description: "Get a single flow tab by id or label",
      inputSchema: z.object({
        idOrLabel: z.string(),
      }),
    },
    async (args) => {
      const flow = await client.getFlow(args.idOrLabel);
      return { content: [{ type: "text", text: JSON.stringify(flow, null, 2) }] };
    }
  );
}
