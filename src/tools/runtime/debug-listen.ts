import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WebSocket } from "ws";
import { type NodeRedClient } from "../../client/index.js";

const COMMS_PATH = "/comms";

interface DebugMessage {
  topic: string;
  data: Record<string, unknown>;
}

export function registerDebugListenTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-debug-listen",
    {
      title: "Listen Debug",
      description: "Capture Node-RED debug messages via WebSocket for a specified duration",
      inputSchema: z.object({
        duration: z.number().min(1).max(60).optional().default(5),
        nodeId: z.string().optional().describe("Filter by source node ID"),
        flowId: z.string().optional().describe("Filter by flow ID"),
      }),
    },
    async (args) => {
      const baseUrl = client.baseUrl || "http://localhost:1880";
      const wsUrl = baseUrl.replace(/^http/, "ws") + COMMS_PATH;

      return new Promise((resolve) => {
        const messages: DebugMessage[] = [];
        let ws: WebSocket;
        let settled = false;

        const finish = (err?: string) => {
          if (settled) return;
          settled = true;
          try { ws?.close(); } catch {}
          if (err) {
            resolve({ content: [{ type: "text", text: JSON.stringify({ error: err, messages }, null, 2) }], isError: true });
          } else {
            resolve({ content: [{ type: "text", text: JSON.stringify({ captured: messages.length, messages }, null, 2) }] });
          }
        };

        try {
          ws = new WebSocket(wsUrl);
        } catch (e) {
          finish(`WebSocket connection failed: ${(e as Error).message}`);
          return;
        }

        const timeout = setTimeout(() => finish(), args.duration * 1000);

        ws.on("open", () => {
          ws.send(JSON.stringify({ subscribe: "debug" }));
        });

        ws.on("message", (raw) => {
          try {
            const items = JSON.parse(raw.toString());
            const arr = Array.isArray(items) ? items : [items];
            for (const item of arr) {
              if (item.topic === "debug" && item.data) {
                const nodeId = item.data.node;
                const flowId = item.data.z;
                if (args.nodeId && nodeId !== args.nodeId) continue;
                messages.push(item as DebugMessage);
              }
            }
          } catch {}
        });

        ws.on("error", (e) => {
          clearTimeout(timeout);
          finish(`WebSocket error: ${e.message}`);
        });

        ws.on("close", () => {
          clearTimeout(timeout);
          finish();
        });
      });
    }
  );
}
