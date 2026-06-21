import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerFlowTools } from "../tools/flows/index.js";

const mockClient = {
  getFlows: vi.fn(),
  getFlow: vi.fn(),
  createFlow: vi.fn(),
  updateFlow: vi.fn(),
  deleteFlow: vi.fn(),
  inject: vi.fn(),
} as any;

function buildServer() {
  const s = new McpServer({ name: "test", version: "1.0" });
  registerFlowTools(s, mockClient);
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

const sampleTabNode = { id: "t1", type: "tab", label: "Flow 1", disabled: false };
const sampleInjectNode = { id: "n1", type: "inject", z: "t1", name: "Inject1", wires: [["n2"]] };
const sampleDebugNode = { id: "n2", type: "debug", z: "t1", name: "Debug1", wires: [] };

describe("Flows Tools", () => {
  it("flows-list returns tabs and counts", async () => {
    mockClient.getFlows.mockResolvedValue([sampleTabNode, sampleInjectNode, sampleDebugNode]);
    const r = await callTool("node-red-flows-list", {});
    const data = JSON.parse(r.content[0].text);
    expect(data.tabs).toHaveLength(1);
    expect(data.nodeCount).toBe(2);
    expect(data.edgeCount).toBe(1);
  });

  it("flows-get retrieves a flow by ID", async () => {
    mockClient.getFlow.mockResolvedValue({ id: "t1", label: "Flow 1", nodes: [] });
    const r = await callTool("node-red-flows-get", { idOrLabel: "t1" });
    const data = JSON.parse(r.content[0].text);
    expect(data.label).toBe("Flow 1");
  });

  it("flows-get resolves label to ID on first failure", async () => {
    mockClient.getFlow
      .mockRejectedValueOnce(new Error("Not found"))
      .mockResolvedValueOnce({ id: "t1", label: "Flow 1", nodes: [] });
    mockClient.getFlows.mockResolvedValue([sampleTabNode]);
    const r = await callTool("node-red-flows-get", { idOrLabel: "Flow 1" });
    const data = JSON.parse(r.content[0].text);
    expect(data.id).toBe("t1");
  });

  it("flows-create creates a new flow", async () => {
    mockClient.createFlow.mockResolvedValue({ id: "new-flow-id", label: "New Flow", nodes: [] });
    const r = await callTool("node-red-flows-create", { label: "New Flow", nodes: [] });
    const data = JSON.parse(r.content[0].text);
    expect(data.status).toBe("created");
    expect(data.flowId).toBeTruthy();
  });

  it("flows-update updates an existing flow", async () => {
    mockClient.getFlow.mockResolvedValue({ id: "t1", label: "Flow 1", nodes: [] });
    mockClient.getFlows.mockResolvedValue([sampleTabNode]);
    mockClient.updateFlow.mockResolvedValue({ status: "ok" });
    const r = await callTool("node-red-flows-update", { id: "t1", nodes: [] });
    const data = JSON.parse(r.content[0].text);
    expect(data.status).toBe("updated");
  });

  it("flows-delete deletes a flow", async () => {
    mockClient.deleteFlow.mockResolvedValue({});
    const r = await callTool("node-red-flows-delete", { id: "t1" });
    const data = JSON.parse(r.content[0].text);
    expect(data.status).toBe("deleted");
  });

  it("flows-inject triggers an inject node", async () => {
    mockClient.inject.mockResolvedValue(null);
    const r = await callTool("node-red-inject", { nodeId: "n1" });
    const data = JSON.parse(r.content[0].text);
    expect(data.status).toBe("injected");
  });

  it("flows-rollback rolls back to snapshot", async () => {
    mockClient.getFlow.mockResolvedValue({ id: "t1", label: "Flow 1", nodes: [] });
    // First call records a snapshot, then rollback can find it
    await callTool("node-red-flows-update", { id: "t1", nodes: [sampleInjectNode] });

    mockClient.getFlows.mockResolvedValue([sampleTabNode]);
    mockClient.updateFlow.mockResolvedValue({ status: "rolled" });
    const r = await callTool("node-red-flows-rollback", { id: "t1" });
    const data = JSON.parse(r.content[0].text);
    expect(data.status).toBe("rolled-back");
  });
});
