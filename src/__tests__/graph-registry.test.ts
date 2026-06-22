import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFs = {
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
};

vi.mock("node:fs", () => mockFs);

const mockClient = {
  getFlows: vi.fn(),
  getFlow: vi.fn(),
} as any;

const sampleFlows = [
  { id: "tab1", type: "tab", label: "Flow Alpha", disabled: false },
  { id: "tab2", type: "tab", label: "Flow Beta", disabled: false },
  { id: "n1", type: "inject", z: "tab1", name: "Trigger", wires: [["n2"]] },
  { id: "n2", type: "function", z: "tab1", name: "Process", wires: [["n3"]] },
  { id: "n3", type: "debug", z: "tab1", name: "Output", wires: [] },
  { id: "n4", type: "inject", z: "tab2", name: "Start", wires: [] },
  { id: "n5", type: "ui-button", z: "tab1", name: "Dashboard Btn" },
  { id: "n6", type: "mqtt in", z: "tab1", name: "MQTT Feed" },
  { id: "n7", type: "template", z: "tab1", name: "HTML View" },
  { id: "n8", type: "http in", z: "tab1", name: "API Endpoint" },
  { id: "n9", type: "file", z: "tab2", name: "Log Writer" },
];

const expectedEntries = [
  { id: "n1", type: "inject", name: "Trigger", flowId: "tab1", flowLabel: "Flow Alpha", category: "source" },
  { id: "n2", type: "function", name: "Process", flowId: "tab1", flowLabel: "Flow Alpha", category: "transform" },
  { id: "n3", type: "debug", name: "Output", flowId: "tab1", flowLabel: "Flow Alpha", category: "debug" },
  { id: "n4", type: "inject", name: "Start", flowId: "tab2", flowLabel: "Flow Beta", category: "source" },
  { id: "n5", type: "ui-button", name: "Dashboard Btn", flowId: "tab1", flowLabel: "Flow Alpha", category: "dashboard" },
  { id: "n6", type: "mqtt in", name: "MQTT Feed", flowId: "tab1", flowLabel: "Flow Alpha", category: "messaging" },
  { id: "n7", type: "template", name: "HTML View", flowId: "tab1", flowLabel: "Flow Alpha", category: "template" },
  { id: "n8", type: "http in", name: "API Endpoint", flowId: "tab1", flowLabel: "Flow Alpha", category: "network" },
  { id: "n9", type: "file", name: "Log Writer", flowId: "tab2", flowLabel: "Flow Beta", category: "storage" },
];

describe("NodeRegistry", () => {
  let registry: typeof import("../graph/registry.js");

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.resetModules();
    mockFs.existsSync.mockReturnValue(false);
    mockFs.writeFileSync.mockImplementation(() => {});
    registry = await import("../graph/registry.js");
  });

  describe("getRegistrySnapshot", () => {
    it("returns empty before first refresh", () => {
      expect(registry.getRegistrySnapshot()).toHaveLength(0);
    });

    it("returns all entries after refresh", async () => {
      mockClient.getFlows.mockResolvedValue(sampleFlows);
      await registry.refreshRegistry(mockClient);
      expect(registry.getRegistrySnapshot()).toHaveLength(9);
    });
  });

  describe("refreshRegistry", () => {
    it("populates registry from flows", async () => {
      mockClient.getFlows.mockResolvedValue(sampleFlows);
      await registry.refreshRegistry(mockClient);
      const snapshot = registry.getRegistrySnapshot();
      expect(snapshot).toHaveLength(9);
    });

    it("creates correct entries", async () => {
      mockClient.getFlows.mockResolvedValue(sampleFlows);
      await registry.refreshRegistry(mockClient);
      const snapshot = registry.getRegistrySnapshot();
      for (const exp of expectedEntries) {
        const entry = snapshot.find((e) => e.id === exp.id);
        expect(entry).toBeDefined();
        expect(entry!.type).toBe(exp.type);
        expect(entry!.name).toBe(exp.name);
        expect(entry!.flowLabel).toBe(exp.flowLabel);
        expect(entry!.category).toBe(exp.category);
      }
    });

    it("handles empty flows", async () => {
      mockClient.getFlows.mockResolvedValue([]);
      await registry.refreshRegistry(mockClient);
      expect(registry.getRegistrySnapshot()).toHaveLength(0);
    });

    it("handles tab-less nodes", async () => {
      mockClient.getFlows.mockResolvedValue([
        { id: "n1", type: "inject", name: "Orphan" },
      ]);
      await registry.refreshRegistry(mockClient);
      const snapshot = registry.getRegistrySnapshot();
      expect(snapshot).toHaveLength(1);
      expect(snapshot[0].flowLabel).toBe("");
    });

    it("skips refresh on getFlows failure", async () => {
      mockClient.getFlows.mockRejectedValue(new Error("Network error"));
      await registry.refreshRegistry(mockClient);
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it("loads from file then syncs with live data", async () => {
      const persisted = [
        { id: "x1", type: "inject", name: "Deleted", flowId: "t1", flowLabel: "Old", category: "source" },
      ];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(persisted));
      mockClient.getFlows.mockResolvedValue([
        { id: "t1", type: "tab", label: "Live Flow" },
        { id: "n1", type: "inject", z: "t1", name: "Live Node" },
      ]);
      await registry.refreshRegistry(mockClient);
      const snapshot = registry.getRegistrySnapshot();
      expect(snapshot.find((e) => e.id === "x1")).toBeUndefined();
      expect(snapshot.find((e) => e.id === "n1")).toBeDefined();
      expect(snapshot.find((e) => e.id === "n1")!.flowLabel).toBe("Live Flow");
    });

    it("persists to file", async () => {
      mockClient.getFlows.mockResolvedValue(sampleFlows);
      await registry.refreshRegistry(mockClient);
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
      expect(written).toHaveLength(9);
    });
  });

  describe("lookupInRegistry", () => {
    beforeEach(async () => {
      mockClient.getFlows.mockResolvedValue(sampleFlows);
      await registry.refreshRegistry(mockClient);
    });

    it("finds by name", () => {
      const results = registry.lookupInRegistry("Process");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("n2");
    });

    it("finds by type", () => {
      const results = registry.lookupInRegistry("debug");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("n3");
    });

    it("finds by ID", () => {
      const results = registry.lookupInRegistry("n1");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Trigger");
    });

    it("filters by flowId", () => {
      const results = registry.lookupInRegistry("inject", "tab2");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("n4");
    });

    it("returns empty array for no matches", () => {
      const results = registry.lookupInRegistry("nonexistent");
      expect(results).toHaveLength(0);
    });

    it("sorts exact matches higher", () => {
      const results = registry.lookupInRegistry("n1");
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].id).toBe("n1");
    });

    it("limits to 50 results", () => {
      const manyNodes = [];
      for (let i = 0; i < 100; i++) {
        manyNodes.push({ id: `n${i}`, type: "inject", name: `Node${i}` });
      }
      mockClient.getFlows.mockResolvedValue(manyNodes);
      return registry.refreshRegistry(mockClient).then(() => {
        const results = registry.lookupInRegistry("Node");
        expect(results.length).toBeLessThanOrEqual(50);
      });
    });
  });

  describe("getRegistryForFlow", () => {
    beforeEach(async () => {
      mockClient.getFlows.mockResolvedValue(sampleFlows);
      await registry.refreshRegistry(mockClient);
    });

    it("returns entries for specific flow", () => {
      const results = registry.getRegistryForFlow("Flow Alpha");
      expect(results).toHaveLength(7);
    });

    it("returns empty for unknown flow", () => {
      const results = registry.getRegistryForFlow("Nonexistent");
      expect(results).toHaveLength(0);
    });
  });
});
