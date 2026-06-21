import { describe, it, expect } from "vitest";
import { applyPatch } from "../graph/patch.js";
import type { PatchOperation } from "../graph/types.js";

describe("applyPatch", () => {
  it("adds a value at a path", () => {
    const doc = { nodes: [{ id: "n1" }] };
    const result = applyPatch(doc, [
      { op: "add", path: "/nodes/-", value: { id: "n2" } },
    ]);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[1].id).toBe("n2");
  });

  it("replaces a value at a path", () => {
    const doc = { label: "Old Name" };
    const result = applyPatch(doc, [
      { op: "replace", path: "/label", value: "New Name" },
    ]);
    expect(result.label).toBe("New Name");
  });

  it("removes a value at a path", () => {
    const doc = { nodes: [{ id: "n1" }, { id: "n2" }] };
    const result = applyPatch(doc, [
      { op: "remove", path: "/nodes/0" },
    ]);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe("n2");
  });

  it("copies a value from one path to another", () => {
    const doc: Record<string, unknown> = {
      label: "Original",
      target: {},
    };
    const result = applyPatch(doc, [
      { op: "copy", from: "/label", path: "/target/label" },
    ]);
    expect((result.target as Record<string, unknown>).label).toBe("Original");
  });

  it("moves a value from one path to another", () => {
    const doc = { source: "value", target: {} };
    const result = applyPatch(doc as Record<string, unknown>, [
      { op: "move", from: "/source", path: "/target/newKey" },
    ] as PatchOperation[]);
    expect((result.target as Record<string, unknown>).newKey).toBe("value");
    expect((result as Record<string, unknown>).source).toBeUndefined();
  });

  it("tests a value and succeeds", () => {
    const doc = { label: "Expected" };
    const result = applyPatch(doc, [
      { op: "test", path: "/label", value: "Expected" },
    ]);
    expect(result.label).toBe("Expected");
  });

  it("throws on test failure", () => {
    const doc = { label: "Actual" };
    expect(() =>
      applyPatch(doc, [{ op: "test", path: "/label", value: "Expected" }])
    ).toThrow("JSON patch test failed");
  });

  it("throws on invalid pointer", () => {
    expect(() => applyPatch({}, [{ op: "add", path: "no-slash", value: 1 }])).toThrow(
      "Invalid JSON pointer"
    );
  });

  it("throws on unsupported operation", () => {
    expect(() =>
      applyPatch({}, [{ op: "invalid" as PatchOperation["op"], path: "/a", value: 1 }])
    ).toThrow("Unsupported patch operation");
  });

  it("add creates intermediate containers for nested paths", () => {
    const result = applyPatch({} as Record<string, unknown>, [
      { op: "add", path: "/a/b/c", value: "deep" },
    ]);
    expect((result as Record<string, unknown>).a).toBeDefined();
    expect(((result as Record<string, unknown>).a as Record<string, unknown>).b).toBeDefined();
    expect((((result as Record<string, unknown>).a as Record<string, unknown>).b as Record<string, unknown>).c).toBe("deep");
  });

  it("add inserts at specific array index", () => {
    const doc = { nodes: [{ id: "n1" }, { id: "n3" }] };
    const result = applyPatch(doc, [
      { op: "add", path: "/nodes/1", value: { id: "n2" } },
    ]);
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes[0].id).toBe("n1");
    expect(result.nodes[1].id).toBe("n2");
    expect(result.nodes[2].id).toBe("n3");
  });

  it("throws on invalid pointer in copy/move operations", () => {
    expect(() =>
      applyPatch({ label: "v" } as Record<string, unknown>, [
        { op: "copy", from: "bad", path: "/target" },
      ] as PatchOperation[])
    ).toThrow("Invalid JSON pointer");
  });
});
