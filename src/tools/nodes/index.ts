import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type NodeRedClient } from "../../client/index.js";
import { registerListNodesTool } from "./list.js";
import { registerInstallNodeTool } from "./install.js";
import { registerGetModuleTool } from "./get-module.js";
import { registerToggleModuleTool } from "./toggle-module.js";
import { registerRemoveModuleTool } from "./remove-module.js";
import { registerGetSetTool } from "./get-set.js";
import { registerToggleSetTool } from "./toggle-set.js";

export function registerNodeTools(server: McpServer, client: NodeRedClient): void {
  registerListNodesTool(server, client);
  registerInstallNodeTool(server, client);
  registerGetModuleTool(server, client);
  registerToggleModuleTool(server, client);
  registerRemoveModuleTool(server, client);
  registerGetSetTool(server, client);
  registerToggleSetTool(server, client);
}
