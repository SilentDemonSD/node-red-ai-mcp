import type { PatchOperation } from "./types.js";

function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function jsonText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function asRecord(cursor: unknown): Record<string, unknown> {
  return cursor as Record<string, unknown>;
}

function applyJsonPointer(
  target: Record<string, unknown> | unknown[],
  pointer: string,
  operation: "add" | "replace" | "remove",
  value?: unknown
): void {
  if (typeof pointer !== "string" || !pointer.startsWith("/")) {
    throw new Error(`Invalid JSON pointer: ${pointer}`);
  }

  const segments = pointer
    .split("/")
    .slice(1)
    .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));

  let cursor: Record<string, unknown> | unknown[] = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const nextIsNum = /^\d+$/.test(segments[i + 1]);
    const rec = asRecord(cursor);
    if (!(seg in rec) || rec[seg] === null || typeof rec[seg] !== "object") {
      rec[seg] = nextIsNum ? [] : {};
    }
    cursor = rec[seg] as Record<string, unknown> | unknown[];
  }

  const leaf = segments[segments.length - 1];

  if (operation === "remove") {
    if (Array.isArray(cursor)) {
      cursor.splice(leaf === "-" ? cursor.length - 1 : Number(leaf), 1);
    } else {
      delete (cursor as Record<string, unknown>)[leaf];
    }
    return;
  }

  if (operation === "add" && Array.isArray(cursor)) {
    if (leaf === "-") cursor.push(value);
    else cursor.splice(Number(leaf), 0, value);
    return;
  }

  (cursor as Record<string, unknown>)[leaf] = value;
}

function readJsonPointer(target: unknown, pointer: string): unknown {
  if (typeof pointer !== "string" || !pointer.startsWith("/")) {
    throw new Error(`Invalid JSON pointer: ${pointer}`);
  }

  const segments = pointer
    .split("/")
    .slice(1)
    .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));

  let cursor: unknown = target;
  for (const seg of segments) {
    if (cursor === undefined || cursor === null) return undefined;
    cursor = (cursor as Record<string, unknown>)[seg];
  }
  return cursor;
}

export function applyPatch<T extends Record<string, unknown>>(
  document: T,
  operations: PatchOperation[]
): T {
  const next = clone(document) as Record<string, unknown>;

  for (const op of operations) {
    switch (op.op) {
      case "add":
      case "replace":
        applyJsonPointer(next, op.path, op.op, clone(op.value));
        break;
      case "remove":
        applyJsonPointer(next, op.path, "remove");
        break;
      case "copy": {
        const copied = readJsonPointer(next, op.from!);
        applyJsonPointer(next, op.path, "add", clone(copied));
        break;
      }
      case "move": {
        const moved = readJsonPointer(next, op.from!);
        applyJsonPointer(next, op.from!, "remove");
        applyJsonPointer(next, op.path, "add", moved);
        break;
      }
      case "test": {
        const current = readJsonPointer(next, op.path);
        if (jsonText(current) !== jsonText(op.value)) {
          throw new Error(`JSON patch test failed at ${op.path}`);
        }
        break;
      }
      default:
        throw new Error(`Unsupported patch operation: ${(op as PatchOperation).op}`);
    }
  }

  return next as T;
}
