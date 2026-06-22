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
import { registerAddNodeTool } from "./add-node.js";
import { registerRemoveNodeTool } from "./remove-node.js";
import { registerUpdateNodeTool } from "./update-node.js";
import { registerRewireNodeTool } from "./rewire-node.js";
import { registerMoveNodeTool } from "./move-node.js";

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
  registerAddNodeTool(server, client);
  registerRemoveNodeTool(server, client);
  registerUpdateNodeTool(server, client);
  registerRewireNodeTool(server, client);
  registerMoveNodeTool(server, client);
}
