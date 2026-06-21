import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type NodeRedClient } from "../../client/index.js";
import { registerGetSchemeTool } from "./get-scheme.js";
import { registerLoginTool } from "./login.js";
import { registerRevokeTool } from "./revoke.js";

export function registerAuthTools(server: McpServer, client: NodeRedClient): void {
  registerGetSchemeTool(server, client);
  registerLoginTool(server, client);
  registerRevokeTool(server, client);
}
