import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { type NodeRedClient } from "../../client/index.js";
import { isConfigNode, isSubflowNode } from "../../graph/engine.js";

function generateId(): string {
  return randomUUID().replace(/-/g, "");
}

export function registerCloneFlowTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-flows-clone",
    {
      title: "Clone Flow",
      description: "Clone an existing flow tab",
      inputSchema: z.object({
        sourceId: z.string(),
        label: z.string().optional(),
      }),
    },
    async (args) => {
      const source = await client.getFlow(args.sourceId);
      const clonedId = generateId();
      const remap = new Map<string, string>();
      for (const node of source.nodes ?? []) remap.set(node.id, generateId());

      const clonedNodes = (source.nodes ?? []).map((node) => {
        const next = { ...node };
        next.id = remap.get(node.id) ?? generateId();
        if (!isConfigNode(next) && !isSubflowNode(next)) next.z = clonedId;
        if (Array.isArray(next.wires)) {
          next.wires = next.wires.map((ports) =>
            Array.isArray(ports) ? ports.map((tid) => remap.get(tid) ?? tid) : ports
          );
        }
        return next;
      });

      const doc = {
        id: clonedId,
        label: args.label ?? `${source.label ?? source.id} (clone)`,
        nodes: clonedNodes,
        configs: Array.isArray(source.configs) ? JSON.parse(JSON.stringify(source.configs)) : [],
        subflows: Array.isArray(source.subflows) ? JSON.parse(JSON.stringify(source.subflows)) : [],
      };
      const created = await client.createFlow(doc);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ status: "cloned", flowId: (created as Record<string, unknown>).id ?? clonedId, label: doc.label }, null, 2),
          },
        ],
      };
    }
  );
}
