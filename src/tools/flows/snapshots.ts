import type { FlowDocument, FlowsResponse } from "../../graph/types.js";

interface SnapshotEntry {
  rev: string;
  timestamp: string;
  flow: FlowDocument;
}

const snapshots = new Map<string, SnapshotEntry[]>();
const MAX_SNAPSHOTS = 20;

function getRevision(resp: FlowsResponse): string {
  return resp && typeof resp === "object" && !Array.isArray(resp) ? resp.rev ?? "" : "";
}

export function recordSnapshot(flowId: string, flow: FlowDocument, revision: string): void {
  if (!flowId || !flow) return;
  if (!snapshots.has(flowId)) snapshots.set(flowId, []);
  const history = snapshots.get(flowId)!;
  history.push({ rev: revision, timestamp: new Date().toISOString(), flow: JSON.parse(JSON.stringify(flow)) });
  if (history.length > MAX_SNAPSHOTS) history.shift();
}

export function getSnapshots(flowId: string): SnapshotEntry[] {
  return snapshots.get(flowId) ?? [];
}
