import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { buildGraph } from "../../graph/engine.js";

export function registerAnalyzeFlowTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-graph-analyze",
    {
      title: "Analyze Flow",
      description: "Analyze topology, dependencies, and graph health for a flow or all flows",
      inputSchema: z.object({ id: z.string().optional() }),
    },
    async (args) => {
      const raw = await client.getFlows();
      const graph = buildGraph(raw);
      const tabs = args.id ? graph.tabs.filter((t) => t.id === args.id || t.label === args.id) : graph.tabs;
      const riskyTypes = ["catch", "http request", "exec", "function"];
      const riskyNodes = graph.nodes.filter((n) => riskyTypes.includes(String(n.type ?? "").toLowerCase()));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                revision: graph.rev,
                tabs: tabs.map((t) => ({ id: t.id, label: t.label, disabled: t.disabled })),
                sources: graph.sources,
                sinks: graph.sinks,
                cycles: graph.cycles,
                riskyNodes: riskyNodes.map((n) => ({ id: n.id, type: n.type, name: n.name ?? "" })),
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
