import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { buildGraph } from "../../graph/engine.js";

export function registerListFlowsTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-flows-list",
    {
      title: "List Flows",
      description: "List active flow tabs and metadata from Node-RED",
      inputSchema: z.object({}),
    },
    async () => {
      const raw = await client.getFlows();
      const graph = buildGraph(raw);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                revision: graph.rev,
                tabs: graph.tabs.map((t) => ({ id: t.id, label: t.label, disabled: t.disabled })),
                nodeCount: graph.nodes.length,
                edgeCount: graph.edges.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
