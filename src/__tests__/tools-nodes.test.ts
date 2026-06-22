import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerNodeTools } from "../tools/nodes/index.js";

vi.mock("../graph/registry.js", () => {
  const mockEntries = [
    { id: "n1", type: "inject", name: "Trigger", flowId: "tab1", flowLabel: "Alpha", category: "source" },
    { id: "n2", type: "function", name: "Processor", flowId: "tab1", flowLabel: "Alpha", category: "transform" },
    { id: "n3", type: "inject", name: "Starter", flowId: "tab2", flowLabel: "Beta", category: "source" },
  ];
  return {
    lookupInRegistry: vi.fn((q: string, fid?: string) =>
      mockEntries.filter((e) => {
        if (fid && e.flowId !== fid) return false;
        return (
          e.name.toLowerCase().includes(q.toLowerCase()) ||
          e.type.toLowerCase().includes(q.toLowerCase()) ||
          e.id.toLowerCase() === q.toLowerCase()
        );
      })
    ),
    getRegistryForFlow: vi.fn((label: string) =>
      mockEntries.filter((e) => e.flowLabel.toLowerCase() === label.toLowerCase())
    ),
    getRegistrySnapshot: vi.fn().mockReturnValue(mockEntries),
    refreshRegistry: vi.fn().mockResolvedValue(undefined),
  };
});

const mockClient = {
  listNodes: vi.fn(),
  getNodeModule: vi.fn(),
  getNodeSet: vi.fn(),
  installNode: vi.fn(),
  removeNodeModule: vi.fn(),
  toggleNodeModule: vi.fn(),
  toggleNodeSet: vi.fn(),
} as any;

function buildServer() {
  const s = new McpServer({ name: "test", version: "1.0" });
  registerNodeTools(s, mockClient);
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

describe("Nodes Tools", () => {
  it("nodes-list returns installed nodes", async () => {
    mockClient.listNodes.mockResolvedValue([{ id: "n1", name: "test-module" }]);
    const r = await callTool("node-red-nodes-list", {});
    const data = JSON.parse(r.content[0].text);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("test-module");
  });

  it("nodes-get-module returns module details", async () => {
    mockClient.getNodeModule.mockResolvedValue({ name: "@test/mod", version: "1.0.0" });
    const r = await callTool("node-red-nodes-get-module", { module: "@test/mod" });
    const data = JSON.parse(r.content[0].text);
    expect(data.name).toBe("@test/mod");
  });

  it("nodes-get-set returns set details", async () => {
    mockClient.getNodeSet.mockResolvedValue({ name: "my-node", types: ["my-node"] });
    const r = await callTool("node-red-nodes-get-set", { module: "@test/mod", set: "my-node" });
    const data = JSON.parse(r.content[0].text);
    expect(data.name).toBe("my-node");
  });

  it("nodes-install installs a module", async () => {
    mockClient.installNode.mockResolvedValue({ status: "installed" });
    const r = await callTool("node-red-nodes-install", { module: "@test/mod" });
    const data = JSON.parse(r.content[0].text);
    expect(data.status).toBe("installed");
  });

  it("nodes-install with version", async () => {
    mockClient.installNode.mockResolvedValue({ status: "installed" });
    const r = await callTool("node-red-nodes-install", { module: "@test/mod", version: "2.0.0" });
    const data = JSON.parse(r.content[0].text);
    expect(data.status).toBe("installed");
  });

  it("nodes-remove-module removes a module", async () => {
    mockClient.removeNodeModule.mockResolvedValue({});
    const r = await callTool("node-red-nodes-remove-module", { module: "@test/mod" });
    const data = JSON.parse(r.content[0].text);
    expect(data).toBeDefined();
  });

  it("nodes-toggle-module enables/disables module", async () => {
    mockClient.toggleNodeModule.mockResolvedValue({ enabled: false });
    const r = await callTool("node-red-nodes-toggle-module", { module: "@test/mod", enabled: false });
    const data = JSON.parse(r.content[0].text);
    expect(data.enabled).toBe(false);
  });

  it("nodes-toggle-set toggles a node set", async () => {
    mockClient.toggleNodeSet.mockResolvedValue({ enabled: true });
    const r = await callTool("node-red-nodes-toggle-set", { module: "@test/mod", set: "my-node", enabled: true });
    const data = JSON.parse(r.content[0].text);
    expect(data.enabled).toBe(true);
  });

  it("nodes-resolve finds nodes by name", async () => {
    const r = await callTool("node-red-nodes-resolve", { query: "Processor" });
    const data = JSON.parse(r.content[0].text);
    expect(data.matches).toHaveLength(1);
    expect(data.matches[0].id).toBe("n2");
  });

  it("nodes-resolve finds nodes by type", async () => {
    const r = await callTool("node-red-nodes-resolve", { query: "function" });
    const data = JSON.parse(r.content[0].text);
    expect(data.matches).toHaveLength(1);
    expect(data.matches[0].type).toBe("function");
  });

  it("nodes-resolve filters by flowId", async () => {
    const r = await callTool("node-red-nodes-resolve", { query: "inject", flowId: "tab1" });
    const data = JSON.parse(r.content[0].text);
    expect(data.matches).toHaveLength(1);
    expect(data.matches[0].id).toBe("n1");
  });

  it("nodes-resolve returns all nodes in a flow by flowLabel", async () => {
    const r = await callTool("node-red-nodes-resolve", { flowLabel: "Alpha" });
    const data = JSON.parse(r.content[0].text);
    expect(data.matches).toHaveLength(2);
  });

  it("nodes-resolve returns empty for no matches", async () => {
    const r = await callTool("node-red-nodes-resolve", { query: "nonexistent" });
    const data = JSON.parse(r.content[0].text);
    expect(data.matches).toHaveLength(0);
  });

  it("nodes-resolve returns empty when no query or flowLabel", async () => {
    const r = await callTool("node-red-nodes-resolve", {});
    const data = JSON.parse(r.content[0].text);
    expect(data.matches).toHaveLength(0);
  });

  it("nodes-resolve filters by flowLabel + query combo", async () => {
    const r = await callTool("node-red-nodes-resolve", { flowLabel: "Alpha", query: "Trigger" });
    const data = JSON.parse(r.content[0].text);
    expect(data.matches).toHaveLength(1);
    expect(data.matches[0].name).toBe("Trigger");
  });

  it("nodes-resolve returns empty when flowLabel + query mismatch", async () => {
    const r = await callTool("node-red-nodes-resolve", { flowLabel: "Beta", query: "Nonexistent" });
    const data = JSON.parse(r.content[0].text);
    expect(data.matches).toHaveLength(0);
  });
});
