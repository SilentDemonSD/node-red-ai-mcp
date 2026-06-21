import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { buildGraph } from "../../graph/engine.js";

export function registerDeleteFlowTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-flows-delete",
    {
      title: "Delete Flow",
      description: "Delete a flow tab from Node-RED",
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const result = await client.deleteFlow(args.id);
      return { content: [{ type: "text", text: JSON.stringify({ status: "deleted", id: args.id, result }, null, 2) }] };
    }
  );
}
