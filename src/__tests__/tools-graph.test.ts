import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerGraphTools } from "../tools/graph/index.js";

const mockClient = {
  getFlows: vi.fn(),
} as any;

const sampleTabNode = { id: "t1", type: "tab", label: "Flow 1", disabled: false };
const sampleInject = { id: "n1", type: "inject", z: "t1", name: "Inject1", wires: [["n2"]] };
const sampleDebug = { id: "n2", type: "debug", z: "t1", name: "Debug1", wires: [] };

function buildServer() {
  const s = new McpServer({ name: "test", version: "1.0" });
  registerGraphTools(s, mockClient);
  return s;
}

async function callTool(name: string, args: Record<string, unknown>) {
  const server = buildServer();
  const [cTrans, sTrans] = InMemoryTransport.createLinkedPair();
  await server.connect(sTrans);
  const client = new Client({ name: "t", version: "1.0" }, { capabilities: {} });
  await client.connect(cTrans);
  try {
    return await client.callTool({ name, arguments: args });
  } finally {
    client.close().catch(() => {});
    server.close().catch(() => {});
  }
}

describe("Graph Tools", () => {
  it("graph-analyze returns analysis with tabs", async () => {
    mockClient.getFlows.mockResolvedValue([sampleTabNode, sampleInject, sampleDebug]);
    const r = await callTool("node-red-graph-analyze", {});
    const data = JSON.parse(r.content[0].text);
    expect(data.tabs).toHaveLength(1);
    expect(data.sources).toContain("n1");
    expect(data.sinks).toContain("n2");
  });

  it("graph-analyze filters by id", async () => {
    mockClient.getFlows.mockResolvedValue([sampleTabNode, sampleInject, sampleDebug]);
    const r = await callTool("node-red-graph-analyze", { id: "t1" });
    const data = JSON.parse(r.content[0].text);
    expect(data.tabs).toHaveLength(1);
  });

  it("graph-export returns normalized graph", async () => {
    mockClient.getFlows.mockResolvedValue([sampleTabNode, sampleInject, sampleDebug]);
    const r = await callTool("node-red-graph-export", {});
    const data = JSON.parse(r.content[0].text);
    expect(data.tabs).toHaveLength(1);
    expect(data.nodes).toHaveLength(2);
    expect(data.edges).toHaveLength(1);
  });

  it("graph-export returns raw format", async () => {
    mockClient.getFlows.mockResolvedValue([sampleTabNode, sampleInject]);
    const r = await callTool("node-red-graph-export", { format: "raw" });
    const data = JSON.parse(r.content[0].text);
    expect(Array.isArray(data)).toBe(true);
  });

  it("graph-visualize returns text view", async () => {
    mockClient.getFlows.mockResolvedValue([sampleTabNode, sampleInject, sampleDebug]);
    const r = await callTool("node-red-graph-visualize", {});
    expect(typeof r.content[0].text).toBe("string");
    expect(r.content[0].text).toContain("Node-RED Topology View");
  });

  it("graph-summary returns counts", async () => {
    mockClient.getFlows.mockResolvedValue([sampleTabNode, sampleInject, sampleDebug]);
    const r = await callTool("node-red-graph-summary", {});
    const data = JSON.parse(r.content[0].text);
    expect(data.counts).toBeDefined();
  });

  it("graph-query finds matching nodes", async () => {
    mockClient.getFlows.mockResolvedValue([sampleTabNode, sampleInject, sampleDebug]);
    const r = await callTool("node-red-graph-query", { query: "inject" });
    const data = JSON.parse(r.content[0].text);
    expect(data.matches.length).toBeGreaterThan(0);
  });

  it("graph-dependencies returns upstream/downstream", async () => {
    mockClient.getFlows.mockResolvedValue([sampleTabNode, sampleInject, sampleDebug]);
    const r = await callTool("node-red-graph-dependencies", { flowId: "t1", nodeId: "n1" });
    const data = JSON.parse(r.content[0].text);
    expect(data.upstream).toBeDefined();
    expect(data.downstream).toContain("n2");
  });

  it("graph-pack returns context pack", async () => {
    mockClient.getFlows.mockResolvedValue([sampleTabNode, sampleInject, sampleDebug]);
    const r = await callTool("node-red-graph-pack", { query: "inject" });
    const data = JSON.parse(r.content[0].text);
    expect(data.matches).toBeDefined();
  });
});
