import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type NodeRedClient } from "../../client/index.js";
import { registerListFlowsTool } from "./list.js";
import { registerGetFlowTool } from "./get.js";
import { registerCreateFlowTool } from "./create.js";
import { registerUpdateFlowTool } from "./update.js";
import { registerPatchFlowTool } from "./patch.js";
import { registerDeleteFlowTool } from "./delete.js";
import { registerCloneFlowTool } from "./clone.js";
import { registerRollbackFlowTool } from "./rollback.js";
import { registerInjectTool } from "./inject.js";

export function registerFlowTools(server: McpServer, client: NodeRedClient): void {
  registerListFlowsTool(server, client);
  registerGetFlowTool(server, client);
  registerCreateFlowTool(server, client);
  registerUpdateFlowTool(server, client);
  registerPatchFlowTool(server, client);
  registerDeleteFlowTool(server, client);
  registerCloneFlowTool(server, client);
  registerRollbackFlowTool(server, client);
  registerInjectTool(server, client);
}
