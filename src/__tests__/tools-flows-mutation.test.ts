import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerFlowTools } from "../tools/flows/index.js";

vi.mock("../graph/registry.js", () => ({
  refreshRegistry: vi.fn().mockResolvedValue(undefined),
  lookupInRegistry: vi.fn().mockReturnValue([]),
  getRegistrySnapshot: vi.fn().mockReturnValue([]),
  getRegistryForFlow: vi.fn().mockReturnValue([]),
}));

const mockClient = {
  getFlow: vi.fn(),
  getFlows: vi.fn(),
  updateFlow: vi.fn(),
  createFlow: vi.fn(),
  deleteFlow: vi.fn(),
  inject: vi.fn(),
  baseUrl: "http://localhost:1880",
} as any;

const sampleTab = { id: "tab1", type: "tab", label: "Test Flow", disabled: false };
const sampleNodes = [
  { id: "n1", type: "inject", name: "Inject A", z: "tab1", wires: [["n2"]], x: 100, y: 100, topic: "test" },
  { id: "n2", type: "function", name: "Func B", z: "tab1", wires: [["n3"]], x: 300, y: 100, func: "return msg;", outputs: 1 },
  { id: "n3", type: "debug", name: "Debug C", z: "tab1", wires: [], x: 500, y: 100, active: true },
];

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

describe("Node-Level Mutation Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- flows-add-node ----
  describe("flows-add-node", () => {
    it("adds a node to a flow", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);
      mockClient.updateFlow.mockResolvedValue({ status: "ok" });

      const r = await callTool("node-red-flows-add-node", {
        flowId: "tab1",
        node: { id: "n4", type: "inject", name: "New Node", wires: [] },
      });
      const data = JSON.parse(r.content[0].text);
      expect(data.status).toBe("node-added");
      expect(data.nodeId).toBe("n4");
      expect(mockClient.updateFlow).toHaveBeenCalled();

      const sentDoc = mockClient.updateFlow.mock.calls[0][1];
      expect(sentDoc.nodes.find((n: any) => n.id === "n4")).toBeDefined();
    });

    it("rejects duplicate node ID", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);

      const r = await callTool("node-red-flows-add-node", {
        flowId: "tab1",
        node: { id: "n1", type: "inject", name: "Duplicate" },
      });
      expect(r.isError).toBe(true);
      expect(r.content[0].text).toContain("already exists");
    });

    it("rejects wire target not in flow", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);

      const r = await callTool("node-red-flows-add-node", {
        flowId: "tab1",
        node: { id: "n4", type: "inject", wires: [["nonexistent"]] },
      });
      expect(r.isError).toBe(true);
      expect(r.content[0].text).toContain("does not exist");
    });

    it("rejects node with missing type", async () => {
      const r = await callTool("node-red-flows-add-node", {
        flowId: "tab1",
        node: { id: "n4" },
      });
      expect(r.isError).toBe(true);
      expect(r.content[0].text).toContain("type");
    });

    it("auto-generates ID when omitted and positions the node", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);
      mockClient.updateFlow.mockResolvedValue({ status: "ok" });

      const r = await callTool("node-red-flows-add-node", {
        flowId: "tab1",
        node: { type: "inject", name: "Auto ID", wires: [] },
      });
      const data = JSON.parse(r.content[0].text);
      expect(data.status).toBe("node-added");
      expect(data.nodeId).toBeTruthy();
      expect(data.nodeId.length).toBeGreaterThan(0);
      const sentDoc = mockClient.updateFlow.mock.calls[0][1];
      const added = sentDoc.nodes.find((n: any) => n.id === data.nodeId);
      expect(added).toBeDefined();
      expect(added.z).toBe("tab1");
      expect(typeof added.x).toBe("number");
      expect(typeof added.y).toBe("number");
    });
  });

  // ---- flows-remove-node ----
  describe("flows-remove-node", () => {
    it("removes an existing node", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);
      mockClient.updateFlow.mockResolvedValue({ status: "ok" });

      const r = await callTool("node-red-flows-remove-node", {
        flowId: "tab1",
        nodeId: "n2",
      });
      const data = JSON.parse(r.content[0].text);
      expect(data.status).toBe("node-removed");
      expect(data.nodeId).toBe("n2");

      const sentDoc = mockClient.updateFlow.mock.calls[0][1];
      expect(sentDoc.nodes.find((n: any) => n.id === "n2")).toBeUndefined();
    });

    it("cleans up wire references to removed node", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);
      mockClient.updateFlow.mockResolvedValue({ status: "ok" });

      await callTool("node-red-flows-remove-node", {
        flowId: "tab1",
        nodeId: "n2",
      });

      const sentDoc = mockClient.updateFlow.mock.calls[0][1];
      const injectA = sentDoc.nodes.find((n: any) => n.id === "n1");
      // n1's wires should no longer reference n2
      expect(injectA.wires[0]).not.toContain("n2");
    });

    it("removes node and reports wire cleanup count", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);
      mockClient.updateFlow.mockResolvedValue({ status: "ok" });

      const r = await callTool("node-red-flows-remove-node", {
        flowId: "tab1",
        nodeId: "n2",
      });
      const data = JSON.parse(r.content[0].text);
      expect(data.wiresCleaned).toBeGreaterThanOrEqual(0);
      // n1 has wire to n2, so at least 1 wire cleaned
      expect(data.wiresCleaned).toBeGreaterThanOrEqual(1);
    });

    it("throws for non-existent node", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);

      const r = await callTool("node-red-flows-remove-node", {
        flowId: "tab1",
        nodeId: "nonexistent",
      });
      expect(r.isError).toBe(true);
      expect(r.content[0].text).toContain("not found");
    });
  });

  // ---- flows-update-node ----
  describe("flows-update-node", () => {
    it("updates node properties", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);
      mockClient.updateFlow.mockResolvedValue({ status: "ok" });

      const r = await callTool("node-red-flows-update-node", {
        flowId: "tab1",
        nodeId: "n1",
        properties: { topic: "new-topic", name: "Updated Inject" },
      });
      const data = JSON.parse(r.content[0].text);
      expect(data.status).toBe("node-updated");
      expect(data.changedKeys).toContain("topic");
      expect(data.changedKeys).toContain("name");

      const sentDoc = mockClient.updateFlow.mock.calls[0][1];
      const updated = sentDoc.nodes.find((n: any) => n.id === "n1");
      expect(updated.topic).toBe("new-topic");
      expect(updated.name).toBe("Updated Inject");
      // unchanged properties preserved
      expect(updated.x).toBe(100);
    });

    it("reports no changed keys when properties are identical", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);
      mockClient.updateFlow.mockResolvedValue({ status: "ok" });

      const r = await callTool("node-red-flows-update-node", {
        flowId: "tab1",
        nodeId: "n1",
        properties: { topic: "test" },
      });
      const data = JSON.parse(r.content[0].text);
      expect(data.changedKeys).toHaveLength(0);
    });

    it("updates func code on function node", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);
      mockClient.updateFlow.mockResolvedValue({ status: "ok" });

      const newFunc = 'msg.payload = "modified"; return msg;';
      await callTool("node-red-flows-update-node", {
        flowId: "tab1",
        nodeId: "n2",
        properties: { func: newFunc },
      });

      const sentDoc = mockClient.updateFlow.mock.calls[0][1];
      const updated = sentDoc.nodes.find((n: any) => n.id === "n2");
      expect(updated.func).toBe(newFunc);
    });

    it("throws for non-existent node", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);

      const r = await callTool("node-red-flows-update-node", {
        flowId: "tab1",
        nodeId: "nonexistent",
        properties: { name: "X" },
      });
      expect(r.isError).toBe(true);
      expect(r.content[0].text).toContain("not found");
    });

    it("succeeds when properties is empty (no-op)", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);
      mockClient.updateFlow.mockResolvedValue({ status: "ok" });

      const r = await callTool("node-red-flows-update-node", {
        flowId: "tab1",
        nodeId: "n1",
        properties: {},
      });
      expect(r.isError).toBeUndefined();
      const data = JSON.parse(r.content[0].text);
      expect(data.status).toBe("node-updated");
    });
  });

  // ---- flows-rewire-node ----
  describe("flows-rewire-node", () => {
    it("rewires a node to new targets", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);
      mockClient.updateFlow.mockResolvedValue({ status: "ok" });

      const r = await callTool("node-red-flows-rewire-node", {
        flowId: "tab1",
        nodeId: "n1",
        wires: [["n3"]],
      });
      const data = JSON.parse(r.content[0].text);
      expect(data.status).toBe("node-rewired");
      expect(data.wires[0]).toEqual(["n3"]);

      const sentDoc = mockClient.updateFlow.mock.calls[0][1];
      const rewired = sentDoc.nodes.find((n: any) => n.id === "n1");
      expect(rewired.wires).toEqual([["n3"]]);
    });

    it("rejects wire to non-existent target", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);

      const r = await callTool("node-red-flows-rewire-node", {
        flowId: "tab1",
        nodeId: "n1",
        wires: [["nonexistent"]],
      });
      expect(r.isError).toBe(true);
      expect(r.content[0].text).toContain("does not exist");
    });

    it("rejects rewire of non-existent node", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);

      const r = await callTool("node-red-flows-rewire-node", {
        flowId: "tab1",
        nodeId: "nonexistent",
        wires: [["n3"]],
      });
      expect(r.isError).toBe(true);
      expect(r.content[0].text).toContain("not found");
    });

    it("supports multiple output ports", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);
      mockClient.updateFlow.mockResolvedValue({ status: "ok" });

      await callTool("node-red-flows-rewire-node", {
        flowId: "tab1",
        nodeId: "n1",
        wires: [["n2"], ["n3"]],
      });

      const sentDoc = mockClient.updateFlow.mock.calls[0][1];
      const rewired = sentDoc.nodes.find((n: any) => n.id === "n1");
      expect(rewired.wires).toHaveLength(2);
      expect(rewired.wires[0]).toEqual(["n2"]);
      expect(rewired.wires[1]).toEqual(["n3"]);
    });
  });

  // ---- flows-move-node ----
  describe("flows-move-node", () => {
    it("moves a node to new coordinates", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);
      mockClient.updateFlow.mockResolvedValue({ status: "ok" });

      const r = await callTool("node-red-flows-move-node", {
        flowId: "tab1",
        nodeId: "n1",
        x: 999,
        y: 888,
      });
      const data = JSON.parse(r.content[0].text);
      expect(data.status).toBe("node-moved");
      expect(data.x).toBe(999);
      expect(data.y).toBe(888);

      const sentDoc = mockClient.updateFlow.mock.calls[0][1];
      const moved = sentDoc.nodes.find((n: any) => n.id === "n1");
      expect(moved.x).toBe(999);
      expect(moved.y).toBe(888);
    });

    it("moves to zero coordinates", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);
      mockClient.updateFlow.mockResolvedValue({ status: "ok" });

      await callTool("node-red-flows-move-node", {
        flowId: "tab1",
        nodeId: "n1",
        x: 0,
        y: 0,
      });

      const sentDoc = mockClient.updateFlow.mock.calls[0][1];
      const moved = sentDoc.nodes.find((n: any) => n.id === "n1");
      expect(moved.x).toBe(0);
      expect(moved.y).toBe(0);
    });

    it("throws for non-existent node", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue([sampleTab, ...sampleNodes]);

      const r = await callTool("node-red-flows-move-node", {
        flowId: "tab1",
        nodeId: "nonexistent",
        x: 100,
        y: 200,
      });
      expect(r.isError).toBe(true);
      expect(r.content[0].text).toContain("not found");
    });
  });

  // ---- revision conflict check ----
  describe("revision conflict detection", () => {
    it("throws on revision mismatch for add-node", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue({ rev: "abc", flows: [sampleTab, ...sampleNodes] });
      mockClient.updateFlow.mockResolvedValue({ status: "ok" });

      const r = await callTool("node-red-flows-add-node", {
        flowId: "tab1",
        node: { id: "n4", type: "inject", wires: [] },
        expectedRev: "xyz",
      });
      expect(r.isError).toBe(true);
      expect(r.content[0].text).toContain("Revision conflict");
    });

    it("passes on matching revision for remove-node", async () => {
      mockClient.getFlow.mockResolvedValue({ id: "tab1", label: "Test Flow", nodes: [...sampleNodes] });
      mockClient.getFlows.mockResolvedValue({ rev: "abc", flows: [sampleTab, ...sampleNodes] });
      mockClient.updateFlow.mockResolvedValue({ status: "ok" });

      const r = await callTool("node-red-flows-remove-node", {
        flowId: "tab1",
        nodeId: "n3",
        expectedRev: "abc",
      });
      const data = JSON.parse(r.content[0].text);
      expect(data.status).toBe("node-removed");
    });
  });
});
