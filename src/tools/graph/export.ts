import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../../client/index.js";
import { buildGraph, graphToSerializable } from "../../graph/engine.js";

export function registerExportTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-graph-export",
    {
      title: "Export Flows",
      description: "Export the full flow graph (raw or normalized)",
      inputSchema: z.object({
        format: z.enum(["raw", "normalized"]).optional().default("normalized"),
      }),
    },
    async (args) => {
      const raw = await client.getFlows();
      if (args.format === "raw") {
        return { content: [{ type: "text", text: JSON.stringify(raw, null, 2) }] };
      }
      const graph = buildGraph(raw);
      return { content: [{ type: "text", text: JSON.stringify(graphToSerializable(graph), null, 2) }] };
    }
  );
}
