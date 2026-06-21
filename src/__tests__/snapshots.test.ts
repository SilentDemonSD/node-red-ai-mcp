import { describe, it, expect, beforeEach } from "vitest";

// Must import AFTER clearing module state
const mod = await import("../tools/flows/snapshots.js");

describe("snapshots", () => {
  beforeEach(() => {
    // Reset module-level state by re-importing
  });

  it("recordSnapshot stores a snapshot", () => {
    const flowId = "f1";
    const flow = { id: flowId, label: "Test", nodes: [{ id: "n1", type: "inject" }] } as any;
    mod.recordSnapshot(flowId, flow, "rev1");
    const history = mod.getSnapshots(flowId);
    expect(history).toHaveLength(1);
    expect(history[0].rev).toBe("rev1");
    expect(history[0].flow.nodes).toHaveLength(1);
  });

  it("returns empty array for unknown flow", () => {
    const history = mod.getSnapshots("nonexistent");
    expect(history).toEqual([]);
  });

  it("stores multiple snapshots in order", () => {
    const flowId = "f2";
    mod.recordSnapshot(flowId, { id: flowId, nodes: [] } as any, "rev1");
    mod.recordSnapshot(flowId, { id: flowId, nodes: [] } as any, "rev2");
    const history = mod.getSnapshots(flowId);
    expect(history).toHaveLength(2);
    expect(history[0].rev).toBe("rev1");
    expect(history[1].rev).toBe("rev2");
  });

  it("caps snapshots at MAX_SNAPSHOTS", () => {
    const flowId = "f3";
    for (let i = 0; i < 25; i++) {
      mod.recordSnapshot(flowId, { id: flowId, label: `v${i}`, nodes: [] } as any, `rev${i}`);
    }
    const history = mod.getSnapshots(flowId);
    // MAX_SNAPSHOTS = 20, so after 25 records, first 5 are shifted out
    expect(history).toHaveLength(20);
    expect(history[0].rev).toBe("rev5");
    expect(history[19].rev).toBe("rev24");
  });

  it("stores deep copies of flows", () => {
    const flowId = "f4";
    const original = { id: flowId, label: "original", nodes: [{ id: "n1" }] } as any;
    mod.recordSnapshot(flowId, original, "rev1");
    original.label = "mutated";
    const history = mod.getSnapshots(flowId);
    expect(history[0].flow.label).toBe("original");
  });

  it("ignores recordSnapshot with no flowId", () => {
    mod.recordSnapshot("", { id: "", nodes: [] } as any, "rev1");
    mod.recordSnapshot("f5", undefined as any, "rev1");
  });
});
