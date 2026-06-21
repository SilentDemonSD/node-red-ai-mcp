import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, createNodeRedClient } from "../config.js";
import { createServer } from "../server/index.js";

export async function runStdio(): Promise<void> {
  const config = loadConfig();
  const client = createNodeRedClient(config);

  const transport = new StdioServerTransport();
  const { server, cleanup } = createServer(client);

  await server.connect(transport);
  console.error(`Node-RED MCP server running on stdio for ${config.nodeRedUrl}`);

  process.on("SIGINT", async () => {
    await server.close();
    cleanup();
    process.exit(0);
  });
}
