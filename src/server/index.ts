import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type NodeRedClient } from "../client/index.js";
import { registerAuthTools } from "../tools/auth/index.js";
import { registerRuntimeTools } from "../tools/runtime/index.js";
import { registerFlowTools } from "../tools/flows/index.js";
import { registerGraphTools } from "../tools/graph/index.js";
import { registerNodeTools } from "../tools/nodes/index.js";
import { registerResources } from "../resources/index.js";
import { registerPrompts } from "../prompts/index.js";

export type ServerFactoryResponse = {
  server: McpServer;
  cleanup: () => void;
};

export function createServer(client: NodeRedClient): ServerFactoryResponse {
  const server = new McpServer(
    {
      name: "@mysterysd/node-red-mcp",
      title: "Node-RED MCP Server",
      version: "2.0.1",
    },
    {
      capabilities: {
        tools: {
          listChanged: true,
        },
        resources: {
          subscribe: true,
          listChanged: true,
        },
        prompts: {
          listChanged: true,
        },
      },
    }
  );

  registerAuthTools(server, client);
  registerRuntimeTools(server, client);
  registerFlowTools(server, client);
  registerGraphTools(server, client);
  registerNodeTools(server, client);
  registerResources(server, client);
  registerPrompts(server, client);

  return {
    server,
    cleanup: () => {},
  };
}
