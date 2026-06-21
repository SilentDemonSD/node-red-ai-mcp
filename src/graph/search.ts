import {
  type FlowGraph,
  type FlowNode,
  type NodeCategory,
  type SemanticIndex,
  type SemanticIndexNode,
  type GraphSummary,
  type RelevantSubgraph,
  type SerializableNode,
} from "./types.js";
import { categorizeNode } from "./engine.js";

function normalizeSearchText(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getNodeSemanticText(node: FlowNode): string {
  const fields = [
    node.id,
    node.type,
    node.name,
    node.label,
    node.topic,
    node.path,
    node.url,
    node.method,
    node.group,
    node.func,
    node.payload,
    node.outputs,
    node.inputs,
    node.broker,
    node.server,
    node.namespace,
    node.tags,
  ] as unknown[];

  return normalizeSearchText(
    fields
      .filter((v) => v !== undefined && v !== null)
      .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
      .join(" ")
  );
}

function scoreSemanticMatch(query: string, text: string): number {
  if (!query || !text) return 0;
  if (text === query) return 100;
  let score = 0;
  for (const token of query.split(/\s+/).filter(Boolean)) {
    if (text.includes(token)) score += token.length >= 4 ? 12 : 6;
  }
  if (score > 0 && text.startsWith(query)) score += 8;
  if (score > 0 && text.includes(query)) score += 10;
  return score;
}

export function buildSemanticIndex(graph: FlowGraph): SemanticIndex {
  const nodes = graph.nodes.map((node) => {
    const semanticText = getNodeSemanticText(node);
    return {
      id: node.id,
      flowId: node.z,
      type: node.type,
      name: node.name ?? "",
      label: node.label ?? "",
      category: graph.categories.get(node.id),
      degreeIn: (graph.reverseAdjacency.get(node.id) ?? new Set()).size,
      degreeOut: (graph.adjacency.get(node.id) ?? []).length,
      semanticText,
    };
  });

  return { nodes, byId: new Map(nodes.map((n) => [n.id, n])) };
}

export function summarizeGraph(graph: FlowGraph): GraphSummary {
  const categoryCounts: Record<string, number> = {};
  for (const node of graph.nodes) {
    const cat = graph.categories.get(node.id) ?? "other";
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }

  const topNodes: SerializableNode[] = graph.nodes
    .map((n) => ({
      id: n.id,
      type: n.type,
      name: n.name ?? "",
      label: n.label ?? "",
      flowId: n.z,
      category: graph.categories.get(n.id),
      inputs: Array.from(graph.reverseAdjacency.get(n.id) ?? []),
      outputs: graph.adjacency.get(n.id) ?? [],
    }))
    .sort((a, b) => b.inputs.length + b.outputs.length - (a.inputs.length + a.outputs.length))
    .slice(0, 12);

  const riskyTypes = ["catch", "http request", "exec", "function"];
  const riskyNodes = graph.nodes
    .filter((n) => riskyTypes.includes(String(n.type ?? "").toLowerCase()))
    .map((n) => ({
      id: n.id,
      type: n.type,
      name: n.name ?? "",
      flowId: n.z,
      category: graph.categories.get(n.id),
    }));

  return {
    revision: graph.rev,
    tabs: graph.tabs.map((t) => ({ id: t.id, label: t.label, disabled: t.disabled })),
    counts: {
      tabs: graph.tabs.length,
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      sources: graph.sources.length,
      sinks: graph.sinks.length,
      cycles: graph.cycles.length,
    },
    categoryCounts,
    highSignalNodes: topNodes,
    riskyNodes,
  };
}

export function collectRelevantSubgraph(
  graph: FlowGraph,
  semanticIndex: SemanticIndex,
  query: string,
  options?: { maxMatches?: number; maxNeighbors?: number }
): RelevantSubgraph {
  const normalizedQuery = normalizeSearchText(query);
  const maxMatches = Math.max(1, options?.maxMatches ?? 10);
  const maxNeighbors = Math.max(0, options?.maxNeighbors ?? 1);

  const matches = semanticIndex.nodes
    .map((n) => ({ ...n, score: scoreSemanticMatch(normalizedQuery, n.semanticText) }))
    .filter((n) => n.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxMatches);

  const nodeIds = new Set(matches.map((n) => n.id));
  const queue = [...nodeIds];

  for (let depth = 0; depth < maxNeighbors && queue.length > 0; depth++) {
    const layerSize = queue.length;
    for (let i = 0; i < layerSize; i++) {
      const currentId = queue.shift()!;
      for (const nextId of graph.adjacency.get(currentId) ?? []) {
        if (!nodeIds.has(nextId)) { nodeIds.add(nextId); queue.push(nextId); }
      }
      for (const prevId of graph.reverseAdjacency.get(currentId) ?? []) {
        if (!nodeIds.has(prevId)) { nodeIds.add(prevId); queue.push(prevId); }
      }
    }
  }

  const relevantNodes = graph.nodes
    .filter((n) => nodeIds.has(n.id))
    .map((n) => ({
      id: n.id,
      type: n.type,
      name: n.name ?? "",
      label: n.label ?? "",
      flowId: n.z,
      category: graph.categories.get(n.id),
      inputs: Array.from(graph.reverseAdjacency.get(n.id) ?? []),
      outputs: graph.adjacency.get(n.id) ?? [],
    }));

  const relevantEdges = graph.edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));
  const catCounts: Record<string, number> = {};
  for (const n of relevantNodes) {
    const cat = n.category ?? "other";
    catCounts[cat] = (catCounts[cat] ?? 0) + 1;
  }

  return {
    query: normalizedQuery,
    matches: matches.map((m) => ({ id: m.id, score: m.score })),
    nodes: relevantNodes,
    edges: relevantEdges,
    summary: {
      nodeCount: relevantNodes.length,
      edgeCount: relevantEdges.length,
      matchCount: matches.length,
      categories: catCounts,
    },
  };
}

export function queryGraph(
  graph: FlowGraph,
  query: string,
  flowId?: string
): Array<{ id: string; type: string; name: string; label: string; category?: NodeCategory; flowId?: string; score: number }> {
  const normalized = normalizeSearchText(query);
  const semanticIndex = buildSemanticIndex(graph);

  return semanticIndex.nodes
    .filter((n) => !flowId || n.flowId === flowId)
    .map((n) => ({
      id: n.id,
      type: n.type,
      name: n.name,
      label: n.label,
      category: n.category,
      flowId: n.flowId,
      score: scoreSemanticMatch(normalized, n.semanticText),
    }))
    .filter((n) => n.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}
