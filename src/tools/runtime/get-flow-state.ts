import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerGetFlowStateTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-runtime-get-flow-state",
    {
      title: "Get Flow State",
      description: "Read runtime flow state",
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.getFlowState();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
