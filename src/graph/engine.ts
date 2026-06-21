import {
  type FlowNode,
  type FlowsResponse,
  type FlowTab,
  type FlowGraph,
  type GraphEdge,
  type NodeCategory,
  type SerializableGraph,
  type SerializableNode,
} from "./types.js";

function getFlowsRevision(flowsResponse: FlowsResponse): string {
  return flowsResponse && typeof flowsResponse === "object" && !Array.isArray(flowsResponse)
    ? flowsResponse.rev || ""
    : "";
}

function normalizeFlowsResponse(flowsResponse: FlowsResponse): FlowNode[] {
  if (Array.isArray(flowsResponse)) return flowsResponse;
  if (Array.isArray(flowsResponse?.flows)) return flowsResponse.flows;
  return [];
}

function getTabs(flowsResponse: FlowsResponse): FlowTab[] {
  return normalizeFlowsResponse(flowsResponse)
    .filter((n) => n.type === "tab")
    .map((n) => ({
      id: n.id,
      label: n.label ?? n.id,
      disabled: Boolean(n.disabled),
    }));
}

function findCycles(adjacency: Map<string, string[]>): string[][] {
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];
  const cycles: string[][] = [];

  function visit(nodeId: string) {
    if (stack.has(nodeId)) {
      const start = path.indexOf(nodeId);
      if (start >= 0) cycles.push([...path.slice(start), nodeId]);
      return;
    }
    if (visited.has(nodeId)) return;

    visited.add(nodeId);
    stack.add(nodeId);
    path.push(nodeId);

    for (const next of adjacency.get(nodeId) ?? []) visit(next);

    stack.delete(nodeId);
    path.pop();
  }

  for (const nodeId of adjacency.keys()) visit(nodeId);
  return cycles;
}

export function categorizeNode(node: FlowNode): NodeCategory {
  const type = String(node?.type ?? "").toLowerCase();
  if (!type) return "unknown";
  if (/^(inject|http in|mqtt in|catch|websocket in|tcp in|udp in)$/.test(type)) return "trigger";
  if (/^(debug|file|http response|websocket out|tcp out|udp out|template)$/.test(type)) return "sink";
  if (/^(function|change|switch|template|delay|trigger|rbe)$/.test(type)) return "transform";
  if (type === "subflow") return "subflow";
  if (isConfigNode(node)) return "config";
  return "other";
}

export function isConfigNode(node: FlowNode): boolean {
  return Boolean(
    node &&
      node.type &&
      node.z === undefined &&
      node.x === undefined &&
      node.y === undefined &&
      node.wires === undefined
  );
}

export function isSubflowNode(node: FlowNode): boolean {
  return node?.type === "subflow";
}

export function buildGraph(flowsResponse: FlowsResponse): FlowGraph {
  const flows = normalizeFlowsResponse(flowsResponse);
  const tabs = getTabs(flowsResponse);
  const nodes = flows.filter((n) => n.type !== "tab");
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, Set<string>>();
  const edges: GraphEdge[] = [];

  for (const node of nodes) {
    const out: string[] = [];
    for (const port of node.wires ?? []) {
      for (const targetId of port) {
        if (!targetId) continue;
        out.push(targetId);
        edges.push({ from: node.id, to: targetId });
        if (!reverseAdjacency.has(targetId)) reverseAdjacency.set(targetId, new Set());
        reverseAdjacency.get(targetId)!.add(node.id);
      }
    }
    adjacency.set(node.id, out);
  }

  const inDegree = new Map(nodes.map((n) => [n.id, 0]));
  for (const edge of edges) {
    if (inDegree.has(edge.to)) inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const sources = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const sinks = nodes.filter((n) => (adjacency.get(n.id) ?? []).length === 0).map((n) => n.id);
  const cycles = findCycles(adjacency);
  const categories = new Map<string, NodeCategory>();
  for (const node of nodes) categories.set(node.id, categorizeNode(node));

  return {
    rev: getFlowsRevision(flowsResponse),
    tabs,
    nodes,
    nodeById,
    adjacency,
    reverseAdjacency,
    edges,
    sources,
    sinks,
    cycles,
    categories,
  };
}

export function collectClosure(
  adjacencyMap: Map<string, string[] | Set<string>>,
  startNodeId: string
): string[] {
  const seen = new Set<string>();
  const stack = [startNodeId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    for (const next of adjacencyMap.get(current) ?? []) {
      if (!seen.has(next)) stack.push(next);
    }
  }
  seen.delete(startNodeId);
  return Array.from(seen);
}

export function graphToSerializable(graph: FlowGraph): SerializableGraph {
  return {
    rev: graph.rev,
    tabs: graph.tabs.map((t) => ({ id: t.id, label: t.label, disabled: t.disabled })),
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      name: n.name ?? "",
      label: n.label ?? "",
      flowId: n.z,
      category: graph.categories.get(n.id),
      outputs: graph.adjacency.get(n.id) ?? [],
      inputs: Array.from(graph.reverseAdjacency.get(n.id) ?? []),
    })),
    edges: graph.edges,
    sources: graph.sources,
    sinks: graph.sinks,
    cycles: graph.cycles,
  };
}

export function formatGraph(graph: FlowGraph, focusId?: string | null): string {
  const tabs = focusId ? graph.tabs.filter((t) => t.id === focusId) : graph.tabs;
  let out = "Node-RED Topology View\n";
  out += `${"=".repeat(22)}\n`;
  out += `Revision: ${graph.rev || "(unknown)"}\n`;
  out += `Tabs: ${tabs.length}\n`;
  out += `Nodes: ${graph.nodes.length}\n`;
  out += `Edges: ${graph.edges.length}\n`;
  out += `Sources: ${graph.sources.length}\n`;
  out += `Sinks: ${graph.sinks.length}\n`;
  out += `Cycles: ${graph.cycles.length}\n\n`;

  for (const tab of tabs) {
    const tabNodes = graph.nodes.filter((n) => n.z === tab.id);
    out += `Flow: ${tab.label || tab.id} [${tab.id}]\n`;
    out += `  Disabled: ${tab.disabled}\n`;
    out += `  Nodes: ${tabNodes.length}\n`;

    for (const node of tabNodes) {
      const targets = graph.adjacency.get(node.id) ?? [];
      const nIns = (graph.reverseAdjacency.get(node.id) ?? new Set()).size;
      out += `  - ${node.name || node.type} (${node.type}) [${node.id}]\n`;
      out += `    Category: ${graph.categories.get(node.id) ?? "other"}\n`;
      out += `    Inputs: ${nIns}\n`;
      out += `    Outputs: ${targets.length}\n`;
      if (targets.length > 0) out += `    WiresTo: ${targets.join(", ")}\n`;
    }
    out += "\n";
  }

  return out.trimEnd();
}
