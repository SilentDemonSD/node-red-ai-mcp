import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { type NodeRedClient } from "../../client/index.js";
import type { FlowDocument } from "../../graph/types.js";
import { autoLayout } from "./layout.js";
import { refreshRegistry } from "../../graph/registry.js";

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
      const remap = new Map<string, string>();
      for (const node of args.nodes) {
        const oldId = (node.id as string) || generateId();
        remap.set(oldId, generateId());
      }
      const nodes = args.nodes.map((n: Record<string, unknown>) => {
        const oldId = (n.id as string) || "";
        const next: Record<string, unknown> = { ...n, id: remap.get(oldId) ?? generateId(), z: flowId };
        if (Array.isArray(next.wires)) {
          next.wires = next.wires.map((ports: unknown) =>
            Array.isArray(ports) ? ports.map((tid: string) => remap.get(tid) ?? tid) : ports
          );
        }
        return next;
      });
      autoLayout(nodes);
      const doc = {
        id: flowId,
        label: args.label,
        nodes,
        configs: args.configs,
        subflows: args.subflows,
      } as unknown as FlowDocument;
      const created = await client.createFlow(doc);
      await refreshRegistry(client);
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
