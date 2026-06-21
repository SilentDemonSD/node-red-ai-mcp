import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WebSocket } from "ws";
import { type NodeRedClient } from "../../client/index.js";

interface DebugMessage {
  topic: string;
  data: Record<string, unknown>;
}

export function registerInjectTool(server: McpServer, client: NodeRedClient): void {
  server.registerTool(
    "node-red-inject",
    {
      title: "Inject",
      description: "Trigger an inject node by its ID. Optionally capture debug output.",
      inputSchema: z.object({
        nodeId: z.string().describe("ID of the inject node to trigger"),
        waitForDebug: z.number().min(0).max(60).optional().default(0)
          .describe("Seconds to wait for debug output after injecting (0 = no wait)"),
      }),
    },
    async (args) => {
      if (!args.waitForDebug || args.waitForDebug <= 0) {
        const result = await client.inject(args.nodeId);
        return { content: [{ type: "text", text: JSON.stringify(result ?? { status: "injected" }, null, 2) }] };
      }

      const wsUrl = client.baseUrl.replace(/^http/, "ws") + "/comms";
      const captured: DebugMessage[] = [];

      return new Promise((resolve) => {
        let ws: WebSocket;
        let settled = false;

        const finish = () => {
          if (settled) return;
          settled = true;
          try { ws?.close(); } catch {}
          resolve({
            content: [
              {
                type: "text",
                text: JSON.stringify({ status: "injected", debug: captured, debugCount: captured.length }, null, 2),
              },
            ],
          });
        };

        try {
          ws = new WebSocket(wsUrl);
        } catch (e) {
          resolve({
            content: [
              {
                type: "text",
                text: JSON.stringify({ status: "injected", error: `WebSocket failed: ${(e as Error).message}` }, null, 2),
              },
            ],
          });
          return;
        }

        const timeout = setTimeout(() => finish(), args.waitForDebug! * 1000);

        ws.on("open", () => {
          ws.send(JSON.stringify({ subscribe: "debug" }));
          client.inject(args.nodeId!).catch(() => {});
        });

        ws.on("message", (raw) => {
          try {
            const items = JSON.parse(raw.toString());
            const arr = Array.isArray(items) ? items : [items];
            for (const item of arr) {
              if (item.topic === "debug" && item.data) {
                captured.push(item);
                if (captured.length >= 10) finish();
              }
            }
          } catch {}
        });

        ws.on("error", () => finish());
        ws.on("close", () => finish());
      });
    }
  );
}
