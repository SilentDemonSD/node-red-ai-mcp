import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";

export function registerSetFlowStateTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-runtime-set-flow-state",
    {
      title: "Set Flow State",
      description: "Update runtime flow state",
      inputSchema: z.object({
        state: z.union([z.record(z.string(), z.unknown()), z.string()]).describe("Flow state object or JSON string"),
      }),
    },
    async (args) => {
      const state = typeof args.state === "string" ? JSON.parse(args.state) : args.state;
      const result = await client.setFlowState(state);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
