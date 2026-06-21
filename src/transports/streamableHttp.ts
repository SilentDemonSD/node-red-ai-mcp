import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig, createNodeRedClient } from "../config.js";
import { createServer } from "../server/index.js";

export async function runStreamableHttp(): Promise<void> {
  const config = loadConfig();
  const app = express();
  app.use(cors());
  app.use(express.json());

  const transports = new Map<string, { transport: StreamableHTTPServerTransport; cleanup: () => void }>();

  app.all("/mcp", async (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;

    if (req.method === "DELETE" && sessionId) {
      const entry = transports.get(sessionId);
      if (entry) {
        entry.cleanup();
        transports.delete(sessionId);
      }
      res.status(204).end();
      return;
    }

    if (req.method === "POST") {
      if (sessionId) {
        const entry = transports.get(sessionId);
        if (!entry) {
          res.status(404).send("Session not found");
          return;
        }
        await entry.transport.handleRequest(req, res);
        return;
      }

      const client = createNodeRedClient(config);
      const { server, cleanup } = createServer(client);
      const transport = new StreamableHTTPServerTransport();

      await server.connect(transport);
      const sid = transport.sessionId;
      if (sid) {
        transports.set(sid, { transport, cleanup });
        res.on("close", () => {
          transports.delete(sid);
          cleanup();
        });
      }

      await transport.handleRequest(req, res);
      return;
    }

    res.status(405).send("Method not allowed");
  });

  app.listen(config.streamableHttpPort, () => {
    console.error(`Node-RED MCP Streamable HTTP server running on http://localhost:${config.streamableHttpPort}/mcp`);
  });
}
