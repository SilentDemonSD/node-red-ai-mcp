import { type NodeRedClient } from "../../client/index.js";
import { buildGraph } from "../../graph/engine.js";
import { recordSnapshot } from "./snapshots.js";
import type { FlowDocument } from "../../graph/types.js";
import { refreshRegistry } from "../../graph/registry.js";

export async function mutateFlow(
  client: NodeRedClient,
  flowId: string,
  expectedRev: string | undefined,
  mutator: (flow: FlowDocument) => FlowDocument
): Promise<{ original: FlowDocument; result: unknown }> {
  const existing = await client.getFlow(flowId);

  if (expectedRev) {
    const current = await client.getFlows();
    const graph = buildGraph(current);
    const rev = graph.rev;
    if (rev && rev !== expectedRev) {
      throw new Error(`Revision conflict: expected ${expectedRev}, current ${rev}`);
    }
  }

  const flows = await client.getFlows();
  recordSnapshot(flowId, existing, buildGraph(flows).rev);

  const modified = mutator(JSON.parse(JSON.stringify(existing)) as FlowDocument);
  const result = await client.updateFlow(flowId, modified);

  await refreshRegistry(client);

  return { original: existing, result };
}
