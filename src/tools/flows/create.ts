import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { type NodeRedClient } from "../../client/index.js";
import type { FlowDocument } from "../../graph/types.js";

function generateId(): string {
  return randomUUID().replace(/-/g, "");
}

export function registerCreateFlowTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-flows-create",
    {
      title: "Create Flow",
      description: "Create a new flow tab in Node-RED",
      inputSchema: z.object({
        label: z.string(),
        nodes: z.array(z.record(z.string(), z.unknown())),
        configs: z.array(z.record(z.string(), z.unknown())).optional().default([]),
        subflows: z.array(z.record(z.string(), z.unknown())).optional().default([]),
      }),
    },
    async (args) => {
      const flowId = generateId();
      const doc = {
        id: flowId,
        label: args.label,
        nodes: args.nodes.map((n) => ({ ...n, id: (n.id as string) || generateId(), z: flowId })),
        configs: args.configs,
        subflows: args.subflows,
      } as unknown as FlowDocument;
      const created = await client.createFlow(doc);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ status: "created", flowId: (created as Record<string, unknown>).id ?? flowId }, null, 2),
          },
        ],
      };
    }
  );
}
