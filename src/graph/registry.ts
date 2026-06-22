import { type NodeRedClient } from "../client/index.js";
import { buildGraph } from "./engine.js";
import type { FlowNode } from "./types.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export interface RegistryEntry {
  id: string;
  type: string;
  name: string;
  flowId: string;
  flowLabel: string;
  category: string;
}

const registry = new Map<string, RegistryEntry>();
const MAX_ENTRIES = 5000;
let dirty = false;

function getRegistryPath(): string {
  return process.env.NODE_REGISTRY_PATH ?? path.join(process.cwd(), "node-registry.json");
}

function loadRegistry(): void {
  try {
    const p = getRegistryPath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, "utf-8")) as RegistryEntry[];
      registry.clear();
      for (const entry of data) {
        registry.set(entryKey(entry.flowId, entry.id), entry);
      }
    }
  } catch {
    registry.clear();
  }
}

function saveRegistry(): void {
  try {
    const p = getRegistryPath();
    const data = Array.from(registry.values());
    fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
    dirty = false;
  } catch {
  }
}

function entryKey(flowId: string, nodeId: string): string {
  return `${flowId}/${nodeId}`;
}

let loaded = false;

export async function refreshRegistry(client: NodeRedClient): Promise<void> {
  if (!loaded) {
    loadRegistry();
    loaded = true;
  }

  try {
    const flowsResp = await client.getFlows();
    const graph = buildGraph(flowsResp);
    const tabMap = new Map<string, string>();
    for (const tab of graph.tabs) {
      tabMap.set(tab.id, tab.label);
    }

    const currentKeys = new Set<string>();
    const seenTypes = new Set<string>();

    for (const node of graph.nodes) {
      const fId = node.z ?? "";
      const key = entryKey(fId, node.id);
      currentKeys.add(key);

      if (!registry.has(key)) {
        const category = stringCategory(node.type);
        registry.set(key, {
          id: node.id,
          type: node.type,
          name: node.name ?? node.type,
          flowId: fId,
          flowLabel: tabMap.get(fId) ?? fId,
          category,
        });
        seenTypes.add(node.type);
      }
    }

    for (const [key, entry] of registry) {
      if (!currentKeys.has(key)) {
        registry.delete(key);
      }
    }

    if (registry.size > MAX_ENTRIES) {
      const entries = Array.from(registry.values());
      entries.length = MAX_ENTRIES;
      registry.clear();
      for (const e of entries) {
        registry.set(entryKey(e.flowId, e.id), e);
      }
    }

    dirty = true;
    saveRegistry();
  } catch {
  }
}

export function lookupInRegistry(
  query: string,
  flowId?: string
): RegistryEntry[] {
  const q = query.toLowerCase();
  const results: RegistryEntry[] = [];

  for (const entry of registry.values()) {
    if (flowId && entry.flowId !== flowId) continue;

    if (
      entry.id.toLowerCase() === q ||
      entry.name.toLowerCase().includes(q) ||
      entry.type.toLowerCase().includes(q) ||
      entry.flowLabel.toLowerCase().includes(q) ||
      entry.category.toLowerCase().includes(q)
    ) {
      results.push(entry);
    }
  }

  results.sort((a, b) => {
    let sa = 0, sb = 0;
    if (a.name.toLowerCase() === q) sa += 10;
    if (a.type.toLowerCase() === q) sa += 5;
    if (a.id.toLowerCase() === q) sa += 8;
    if (b.name.toLowerCase() === q) sb += 10;
    if (b.type.toLowerCase() === q) sb += 5;
    if (b.id.toLowerCase() === q) sb += 8;
    return sb - sa;
  });

  return results.slice(0, 50);
}

export function getRegistrySnapshot(): RegistryEntry[] {
  return Array.from(registry.values());
}

export function getRegistryForFlow(flowLabel: string): RegistryEntry[] {
  const q = flowLabel.toLowerCase();
  return Array.from(registry.values()).filter(
    (e) => e.flowLabel.toLowerCase() === q
  );
}

function stringCategory(type: string): string {
  if (!type) return "unknown";
  if (type.startsWith("ui-") || type.startsWith("ui_")) return "dashboard";
  if (type.includes("inject") || type.includes("catch") || type.includes("link")) return "source";
  if (type.includes("debug") || type.includes("status")) return "debug";
  if (type.includes("function") || type.includes("change") || type.includes("switch")) return "transform";
  if (type.includes("http") || type.includes("websocket") || type.includes("tcp") || type.includes("udp")) return "network";
  if (type.includes("mqtt") || type.includes("amqp") || type.includes("kafka")) return "messaging";
  if (type.includes("file")) return "storage";
  if (type.includes("template")) return "template";
  if (type.endsWith("-config") || type.includes("/")) return "config";
  return "other";
}
