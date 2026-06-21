const X_START = 160;
const X_STEP = 220;
const Y_START = 100;
const Y_STEP = 90;

function buildTopology(nodes: Record<string, unknown>[]): {
  depth: Map<string, number>;
} {
  const children = new Map<string, string[]>();
  const parentCount = new Map<string, number>();

  for (const node of nodes) {
    const id = node.id as string;
    if (!children.has(id)) children.set(id, []);
    if (!parentCount.has(id)) parentCount.set(id, 0);

    if (Array.isArray(node.wires)) {
      for (const port of node.wires) {
        if (Array.isArray(port)) {
          for (const tid of port) {
            if (typeof tid === "string") {
              children.get(id)!.push(tid);
              parentCount.set(tid, (parentCount.get(tid) ?? 0) + 1);
            }
          }
        }
      }
    }
  }

  const depth = new Map<string, number>();
  const queue: string[] = [];

  for (const [id, count] of parentCount) {
    if (count === 0) {
      depth.set(id, 0);
      queue.push(id);
    }
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    const d = depth.get(id) ?? 0;
    for (const cid of children.get(id) ?? []) {
      const prev = depth.get(cid) ?? -1;
      if (d + 1 > prev) depth.set(cid, d + 1);
      if (!queue.includes(cid)) queue.push(cid);
    }
  }

  for (const node of nodes) {
    const id = node.id as string;
    if (!depth.has(id)) depth.set(id, 0);
  }

  return { depth };
}

function assignPositions(
  nodes: Record<string, unknown>[],
  depth: Map<string, number>
): void {
  const byDepth = new Map<number, string[]>();
  for (const [id, d] of depth) {
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(id);
  }

  for (const node of nodes) {
    if (typeof node.x !== "number" || typeof node.y !== "number") {
      const id = node.id as string;
      const d = depth.get(id) ?? 0;
      const list = byDepth.get(d) ?? [];
      const idx = list.indexOf(id);
      node.x = X_START + d * X_STEP;
      node.y = Y_START + idx * Y_STEP;
    }
  }
}

function fallbackLayout(nodes: Record<string, unknown>[]): void {
  const depth = new Map<string, number>();
  nodes.forEach((n, i) => depth.set(n.id as string, i));
  assignPositions(nodes, depth);
}

export function autoLayout(nodes: Record<string, unknown>[]): void {
  const allHavePos = nodes.every(
    (n) => typeof n.x === "number" && typeof n.y === "number"
  );
  if (allHavePos || nodes.length === 0) return;

  const { depth } = buildTopology(nodes);

  const depthZeroCount = nodes.filter(
    (n) => (depth.get(n.id as string) ?? 0) === 0
  ).length;

  if (depthZeroCount === nodes.length && nodes.length > 1) {
    fallbackLayout(nodes);
    return;
  }

  assignPositions(nodes, depth);
}
