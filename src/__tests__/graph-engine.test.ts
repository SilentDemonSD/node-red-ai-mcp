import { describe, it, expect } from "vitest";
import {
  categorizeNode,
  isConfigNode,
  isSubflowNode,
  buildGraph,
  collectClosure,
  graphToSerializable,
  formatGraph,
} from "../graph/engine.js";
import type { FlowNode, FlowsResponse } from "../graph/types.js";

describe("categorizeNode", () => {
  it("returns unknown for empty type", () => {
    expect(categorizeNode({ id: "n1", type: "" })).toBe("unknown");
  });

  it("returns trigger for inject nodes", () => {
    expect(categorizeNode({ id: "n1", type: "inject" })).toBe("trigger");
    expect(categorizeNode({ id: "n1", type: "mqtt in" })).toBe("trigger");
  });

  it("returns sink for debug nodes", () => {
    expect(categorizeNode({ id: "n1", type: "debug" })).toBe("sink");
    expect(categorizeNode({ id: "n1", type: "http response" })).toBe("sink");
  });

  it("returns transform for function nodes", () => {
    expect(categorizeNode({ id: "n1", type: "function" })).toBe("transform");
    expect(categorizeNode({ id: "n1", type: "switch" })).toBe("transform");
  });

  it("returns subflow for subflow type", () => {
    expect(categorizeNode({ id: "n1", type: "subflow" })).toBe("subflow");
  });

  it("returns config for config nodes", () => {
    expect(categorizeNode({ id: "n1", type: "mqtt-broker" })).toBe("config");
  });

  it("returns other for unrecognized node on a tab", () => {
    expect(categorizeNode({ id: "n1", type: "unknown-node", z: "tab1", x: 100, y: 100, wires: [] })).toBe("other");
  });
});

describe("isConfigNode", () => {
  it("returns true for config node", () => {
    expect(isConfigNode({ id: "c1", type: "mqtt-broker" })).toBe(true);
  });

  it("returns false when z is set", () => {
    expect(isConfigNode({ id: "n1", type: "inject", z: "tab1", x: 100, y: 100, wires: [] })).toBe(false);
  });
});

describe("isSubflowNode", () => {
  it("returns true for subflow type", () => {
    expect(isSubflowNode({ id: "s1", type: "subflow" })).toBe(true);
  });

  it("returns false for other types", () => {
    expect(isSubflowNode({ id: "n1", type: "inject" })).toBe(false);
  });
});

describe("buildGraph", () => {
  it("handles empty flows", () => {
    const result = buildGraph([] as unknown as FlowsResponse);
    expect(result.nodes).toHaveLength(0);
    expect(result.tabs).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it("handles array response", () => {
    const flows: FlowNode[] = [
      { id: "tab1", type: "tab", label: "Flow 1" },
      { id: "n1", type: "inject", z: "tab1", wires: [["n2"]] },
      { id: "n2", type: "debug", z: "tab1", wires: [] },
    ];
    const result = buildGraph(flows as unknown as FlowsResponse);
    expect(result.tabs).toHaveLength(1);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.sources).toContain("n1");
    expect(result.sinks).toContain("n2");
  });

  it("handles { flows, rev } response", () => {
    const flows: FlowNode[] = [
      { id: "tab1", type: "tab", label: "Flow 1" },
      { id: "n1", type: "inject", z: "tab1", wires: [["n2"]] },
      { id: "n2", type: "debug", z: "tab1", wires: [] },
    ];
    const result = buildGraph({ flows, rev: "abc123" } as unknown as FlowsResponse);
    expect(result.rev).toBe("abc123");
    expect(result.nodes).toHaveLength(2);
  });

  it("detects cycles", () => {
    const flows: FlowNode[] = [
      { id: "tab1", type: "tab", label: "Cycle Test" },
      { id: "n1", type: "inject", z: "tab1", wires: [["n2"]] },
      { id: "n2", type: "function", z: "tab1", wires: [["n3"]] },
      { id: "n3", type: "function", z: "tab1", wires: [["n1"]] },
    ];
    const result = buildGraph(flows as unknown as FlowsResponse);
    expect(result.cycles.length).toBeGreaterThanOrEqual(1);
  });

  it("correctly maps adjacency", () => {
    const flows: FlowNode[] = [
      { id: "tab1", type: "tab", label: "Flow 1" },
      { id: "n1", type: "inject", z: "tab1", wires: [["n2", "n3"]] },
      { id: "n2", type: "debug", z: "tab1", wires: [] },
      { id: "n3", type: "debug", z: "tab1", wires: [] },
    ];
    const result = buildGraph(flows as unknown as FlowsResponse);
    expect(result.adjacency.get("n1")).toEqual(["n2", "n3"]);
    expect(result.reverseAdjacency.get("n2")).toBeDefined();
    expect(result.sources).toContain("n1");
    expect(result.sinks).toContain("n2");
    expect(result.sinks).toContain("n3");
  });
});

describe("collectClosure", () => {
  it("collects downstream nodes", () => {
    const adj = new Map<string, string[]>([
      ["a", ["b"]],
      ["b", ["c"]],
      ["c", []],
    ]);
    const result = collectClosure(adj, "a");
    expect(result.sort()).toEqual(["b", "c"]);
  });

  it("excludes the start node", () => {
    const adj = new Map<string, string[]>([
      ["a", []],
    ]);
    const result = collectClosure(adj, "a");
    expect(result).toHaveLength(0);
  });

  it("handles reverse adjacency maps (Set)", () => {
    const reverseAdj = new Map<string, Set<string>>([
      ["c", new Set(["b"])],
      ["b", new Set(["a"])],
      ["a", new Set()],
    ]);
    const result = collectClosure(reverseAdj, "c");
    expect(result.sort()).toEqual(["a", "b"]);
  });
});

describe("graphToSerializable", () => {
  it("converts graph to serializable format", () => {
    const flows: FlowNode[] = [
      { id: "tab1", type: "tab", label: "Flow 1" },
      { id: "n1", type: "inject", z: "tab1", wires: [["n2"]] },
      { id: "n2", type: "debug", z: "tab1", wires: [] },
    ];
    const graph = buildGraph(flows as unknown as FlowsResponse);
    const serializable = graphToSerializable(graph);
    expect(serializable.nodes).toHaveLength(2);
    expect(serializable.edges).toHaveLength(1);
    expect(serializable.nodes[0]).toHaveProperty("id");
    expect(serializable.nodes[0]).toHaveProperty("inputs");
    expect(serializable.nodes[0]).toHaveProperty("outputs");
  });
});

describe("formatGraph", () => {
  it("produces human-readable output", () => {
    const flows: FlowNode[] = [
      { id: "tab1", type: "tab", label: "Main" },
      { id: "n1", type: "inject", name: "Timer", z: "tab1", wires: [["n2"]] },
      { id: "n2", type: "debug", name: "Log", z: "tab1", wires: [] },
    ];
    const graph = buildGraph(flows as unknown as FlowsResponse);
    const output = formatGraph(graph);
    expect(output).toContain("Topology View");
    expect(output).toContain("Timer");
    expect(output).toContain("Log");
    expect(output).toContain("Flow: Main");
  });

  it("filters by flowId", () => {
    const flows: FlowNode[] = [
      { id: "tab1", type: "tab", label: "Main" },
      { id: "tab2", type: "tab", label: "Other" },
      { id: "n1", type: "inject", z: "tab1", wires: [] },
      { id: "n2", type: "inject", z: "tab2", wires: [] },
    ];
    const graph = buildGraph(flows as unknown as FlowsResponse);
    const output = formatGraph(graph, "tab1");
    expect(output).toContain("Flow: Main");
    expect(output).not.toContain("Flow: Other");
  });

  it("normalizeFlowsResponse returns empty array for object without flows array", () => {
    const result = buildGraph({} as unknown as FlowsResponse);
    expect(result.nodes).toHaveLength(0);
    expect(result.tabs).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
    expect(result.rev).toBe("");
  });

  it("normalizeFlowsResponse returns empty array for object with non-array flows", () => {
    const result = buildGraph({ rev: "abc" } as unknown as FlowsResponse);
    expect(result.nodes).toHaveLength(0);
    expect(result.rev).toBe("abc");
  });

  it("handles nodes with undefined wires", () => {
    const flows: FlowNode[] = [
      { id: "tab1", type: "tab", label: "Flow 1" },
      { id: "n1", type: "inject", z: "tab1" } as unknown as FlowNode,
    ];
    const result = buildGraph(flows as unknown as FlowsResponse);
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(0);
  });
});
