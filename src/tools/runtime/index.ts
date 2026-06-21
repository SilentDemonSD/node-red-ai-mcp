import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type NodeRedClient } from "../../client/index.js";
import { registerGetSettingsTool } from "./get-settings.js";
import { registerGetDiagnosticsTool } from "./get-diagnostics.js";
import { registerGetFlowStateTool } from "./get-flow-state.js";
import { registerSetFlowStateTool } from "./set-flow-state.js";
import { registerDebugListenTool } from "./debug-listen.js";

export function registerRuntimeTools(server: McpServer, client: NodeRedClient): void {
  registerGetSettingsTool(server, client);
  registerGetDiagnosticsTool(server, client);
  registerGetFlowStateTool(server, client);
  registerSetFlowStateTool(server, client);
  registerDebugListenTool(server, client);
}
