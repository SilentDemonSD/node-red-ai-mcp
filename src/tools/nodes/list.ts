import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerListNodesTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-nodes-list",
    {
      title: "List Nodes",
      description: "List installed node modules and node sets in Node-RED",
      inputSchema: z.object({}),
    },
    async () => {
      const nodes = await client.listNodes();
      return { content: [{ type: "text", text: JSON.stringify(nodes, null, 2) }] };
    }
  );
}
