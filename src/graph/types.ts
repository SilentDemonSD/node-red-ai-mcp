export interface FlowTab {
  id: string;
  label: string;
  disabled: boolean;
}

export interface FlowNode {
  id: string;
  type: string;
  name?: string;
  label?: string;
  z?: string;
  wires?: string[][];
  x?: number;
  y?: number;
  [key: string]: unknown;
}

export interface FlowDocument {
  id?: string;
  label?: string;
  nodes: FlowNode[];
  configs?: FlowNode[];
  subflows?: FlowNode[];
  [key: string]: unknown;
}

export interface FlowsResponse {
  flows?: FlowNode[];
  rev?: string;
  [key: string]: unknown;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface FlowGraph {
  rev: string;
  tabs: FlowTab[];
  nodes: FlowNode[];
  nodeById: Map<string, FlowNode>;
  adjacency: Map<string, string[]>;
  reverseAdjacency: Map<string, Set<string>>;
  edges: GraphEdge[];
  sources: string[];
  sinks: string[];
  cycles: string[][];
  categories: Map<string, NodeCategory>;
}

export type NodeCategory =
  | "trigger"
  | "sink"
  | "transform"
  | "subflow"
  | "config"
  | "other"
  | "unknown";

export interface SerializableNode {
  id: string;
  type: string;
  name: string;
  label: string;
  flowId?: string;
  category?: NodeCategory;
  outputs: string[];
  inputs: string[];
}

export interface SerializableGraph {
  rev: string;
  tabs: FlowTab[];
  nodes: SerializableNode[];
  edges: GraphEdge[];
  sources: string[];
  sinks: string[];
  cycles: string[][];
}

export interface SemanticIndexNode {
  id: string;
  flowId?: string;
  type: string;
  name: string;
  label: string;
  category?: NodeCategory;
  degreeIn: number;
  degreeOut: number;
  semanticText: string;
}

export interface SemanticIndex {
  nodes: SemanticIndexNode[];
  byId: Map<string, SemanticIndexNode>;
}

export interface GraphSummary {
  revision: string;
  tabs: FlowTab[];
  counts: {
    tabs: number;
    nodes: number;
    edges: number;
    sources: number;
    sinks: number;
    cycles: number;
  };
  categoryCounts: Record<string, number>;
  highSignalNodes: SerializableNode[];
  riskyNodes: Array<{
    id: string;
    type: string;
    name: string;
    flowId?: string;
    category?: NodeCategory;
  }>;
}

export interface RelevantSubgraph {
  query: string;
  matches: Array<{ id: string; score: number }>;
  nodes: SerializableNode[];
  edges: GraphEdge[];
  summary: {
    nodeCount: number;
    edgeCount: number;
    matchCount: number;
    categories: Record<string, number>;
  };
}

export interface PatchOperation {
  op: "add" | "replace" | "remove" | "copy" | "move" | "test";
  path: string;
  from?: string;
  value?: unknown;
}
