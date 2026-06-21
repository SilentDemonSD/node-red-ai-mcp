import { describe, it, expect } from "vitest";
import {
  buildSemanticIndex,
  summarizeGraph,
  collectRelevantSubgraph,
  queryGraph,
} from "../graph/search.js";
import { buildGraph } from "../graph/engine.js";
import type { FlowNode, FlowsResponse } from "../graph/types.js";

function makeFlows(nodes: FlowNode[]): FlowsResponse {
  return nodes as unknown as FlowsResponse;
}


describe("buildSemanticIndex", () => {
  it("creates index from graph nodes", () => {
    const flows: FlowNode[] = [
      { id: "tab1", type: "tab", label: "Flow 1" },
      { id: "n1", type: "inject", name: "Timer", z: "tab1", wires: [["n2"]] },
      { id: "n2", type: "debug", name: "Console", z: "tab1", wires: [] },
    ];
    const graph = buildGraph(makeFlows(flows));
    const index = buildSemanticIndex(graph);
    expect(index.nodes).toHaveLength(2);
    expect(index.byId.get("n1")).toBeDefined();
    expect(index.byId.get("n1")!.semanticText).toBeTruthy();
  });
});

describe("summarizeGraph", () => {
  it("produces complete summary", () => {
    const flows: FlowNode[] = [
      { id: "tab1", type: "tab", label: "Flow 1" },
      { id: "n1", type: "inject", z: "tab1", wires: [["n2"]] },
      { id: "n2", type: "function", z: "tab1", wires: [["n3"]] },
      { id: "n3", type: "debug", z: "tab1", wires: [] },
    ];
    const graph = buildGraph(makeFlows(flows));
    const summary = summarizeGraph(graph);
    expect(summary.counts.nodes).toBe(3);
    expect(summary.counts.edges).toBe(2);
    expect(summary.counts.tabs).toBe(1);
    expect(summary.categoryCounts.transform).toBe(1);
    expect(summary.riskyNodes).toHaveLength(1); // function node is risky
  });
});

describe("collectRelevantSubgraph", () => {
  const flows: FlowNode[] = [
    { id: "tab1", type: "tab", label: "Sensor Processing" },
    { id: "n1", type: "mqtt in", name: "Temperature Sensor", topic: "home/kitchen/temp", z: "tab1", wires: [["n2"]] },
    { id: "n2", type: "function", name: "Parse Temp", z: "tab1", wires: [["n3"]] },
    { id: "n3", type: "debug", name: "Log Temp", z: "tab1", wires: [] },
    { id: "n4", type: "inject", name: "Heartbeat", z: "tab1", wires: [["n5"]] },
    { id: "n5", type: "debug", name: "Beat Log", z: "tab1", wires: [] },
  ];

  const graph = buildGraph(makeFlows(flows));
  const index = buildSemanticIndex(graph);

  it("finds matching nodes by query", () => {
    const result = collectRelevantSubgraph(graph, index, "temperature");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.summary.matchCount).toBeGreaterThan(0);
  });

  it("expands to neighbors", () => {
    const result = collectRelevantSubgraph(graph, index, "temperature", { maxNeighbors: 1 });
    expect(result.nodes.length).toBeGreaterThan(result.matches.length);
  });

  it("returns empty for no match", () => {
    const result = collectRelevantSubgraph(graph, index, "zzzznotfound");
    expect(result.matches).toHaveLength(0);
    expect(result.nodes).toHaveLength(0);
  });

  it("respects maxMatches", () => {
    const result = collectRelevantSubgraph(graph, index, "temp", { maxMatches: 1 });
    expect(result.matches.length).toBeLessThanOrEqual(1);
  });

  it("expands via reverse adjacency for mid-chain matches", () => {
    const midGraph = buildGraph(makeFlows([
      { id: "tab1", type: "tab", label: "Chain" },
      { id: "n1", type: "inject", name: "Alpha", z: "tab1", wires: [["n2"]] },
      { id: "n2", type: "function", name: "Beta", z: "tab1", wires: [["n3"]] },
      { id: "n3", type: "debug", name: "Gamma", z: "tab1", wires: [] },
    ]));
    const midIndex = buildSemanticIndex(midGraph);
    const result = collectRelevantSubgraph(midGraph, midIndex, "beta", { maxNeighbors: 1 });
    expect(result.matches[0].id).toBe("n2");
    expect(result.nodes.find((n) => n.id === "n1")).toBeDefined();
    expect(result.nodes.find((n) => n.id === "n3")).toBeDefined();
  });
});

describe("queryGraph", () => {
  const flows: FlowNode[] = [
    { id: "tab1", type: "tab", label: "Main" },
    { id: "tab2", type: "tab", label: "Backup" },
    { id: "n1", type: "inject", name: "Timer A", z: "tab1", wires: [] },
    { id: "n2", type: "inject", name: "Timer B", z: "tab2", wires: [] },
  ];
  const graph = buildGraph(makeFlows(flows));

  it("searches across all flows", () => {
    const results = queryGraph(graph, "timer");
    expect(results).toHaveLength(2);
  });

  it("filters by flowId", () => {
    const results = queryGraph(graph, "timer", "tab1");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("n1");
  });

  it("returns empty for no matches", () => {
    const results = queryGraph(graph, "zzzz");
    expect(results).toHaveLength(0);
  });

  it("scores matches highest for the best match", () => {
    const results = queryGraph(graph, "Timer A");
    expect(results[0].id).toBe("n1");
    expect(results[0].score).toBeGreaterThan(0);
  });
});
