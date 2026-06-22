import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { type NodeRedClient } from "../../client/index.js";
import { mutateFlow } from "./mutation-utils.js";

const X_START = 160;
const Y_START = 100;
const Y_STEP = 90;

function generateId(): string {
  return randomUUID().replace(/-/g, "");
}

function findInsertPosition(nodes: Record<string, unknown>[]): { x: number; y: number } {
  let maxY = Y_START;
  for (const n of nodes) {
    const ny = n.y as number | undefined;
    if (typeof ny === "number" && ny > maxY) maxY = ny;
  }
  return { x: X_START, y: maxY + Y_STEP };
}

export function registerAddNodeTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-flows-add-node",
    {
      title: "Add Node to Flow",
      description: "Add a single node to an existing flow tab. Auto-generates ID if omitted, validates wire targets, and positions the new node.",
      inputSchema: z.object({
        flowId: z.string().describe("ID of the target flow tab"),
        node: z.record(z.string(), z.unknown()).describe("Node object (at minimum 'type' is required)"),
        expectedRev: z.string().optional().describe("Optional revision guard for conflict detection"),
      }),
    },
    async (args) => {
      if (!args.node || typeof args.node !== "object") {
        throw new Error("'node' must be a non-null object");
      }
      const nodeType = args.node.type;
      if (!nodeType || typeof nodeType !== "string") {
        throw new Error("'node.type' is required and must be a string");
      }

      const nodeId = (args.node.id as string) || generateId();

      return mutateFlow(client, args.flowId, args.expectedRev, (flow) => {
        const existingIds = new Set(flow.nodes.map((n) => n.id));
        if (existingIds.has(nodeId)) {
          throw new Error(`Node with id "${nodeId}" already exists in flow "${args.flowId}"`);
        }

        if (args.node.wires) {
          const wires = args.node.wires as unknown[][];
          for (const port of wires) {
            if (Array.isArray(port)) {
              for (const tid of port) {
                if (typeof tid === "string" && !existingIds.has(tid) && tid !== nodeId) {
                  throw new Error(`Wire target "${tid}" does not exist in flow "${args.flowId}"`);
                }
              }
            }
          }
        }

        const newNode: Record<string, unknown> = {
          ...(args.node as Record<string, unknown>),
          id: nodeId,
          z: args.flowId,
        };

        if (typeof newNode.x !== "number" || typeof newNode.y !== "number") {
          const pos = findInsertPosition(flow.nodes);
          newNode.x ??= pos.x;
          newNode.y ??= pos.y;
        }

        flow.nodes.push(newNode as never);
        return flow;
      }).then(({ result }) => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({ status: "node-added", nodeId, result }, null, 2),
          },
        ],
      }));
    }
  );
}
