import express from "express";
import cors from "cors";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { loadConfig, createNodeRedClient } from "../config.js";
import { createServer } from "../server/index.js";

export async function runSse(): Promise<void> {
  const config = loadConfig();
  const app = express();
  app.use(cors());

  const transports: Map<string, SSEServerTransport> = new Map();

  app.get("/sse", async (req, res) => {
    const client = createNodeRedClient(config);
    const { server, cleanup } = createServer(client);

    const transport = new SSEServerTransport("/message", res);
    transports.set(transport.sessionId, transport);

    res.on("close", () => {
      transports.delete(transport.sessionId);
      cleanup();
    });

    await server.connect(transport);
  });

  app.post("/message", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).send("Session not found");
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  app.listen(config.ssePort, () => {
    console.error(`Node-RED MCP SSE server running on http://localhost:${config.ssePort}/sse`);
  });
}
