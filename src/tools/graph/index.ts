import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type NodeRedClient } from "../../client/index.js";
import { registerAnalyzeFlowTool } from "./analyze.js";
import { registerSummaryTool } from "./summary.js";
import { registerExportTool } from "./export.js";
import { registerDependenciesTool } from "./dependencies.js";
import { registerVisualizeTool } from "./visualize.js";
import { registerQueryTool } from "./query.js";
import { registerPackTool } from "./pack.js";

export function registerGraphTools(server: McpServer, client: NodeRedClient): void {
  registerAnalyzeFlowTool(server, client);
  registerSummaryTool(server, client);
  registerExportTool(server, client);
  registerDependenciesTool(server, client);
  registerVisualizeTool(server, client);
  registerQueryTool(server, client);
  registerPackTool(server, client);
}
