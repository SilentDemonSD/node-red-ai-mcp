import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerResources } from "../resources/index.js";

const mockClient = {
  getSettings: vi.fn(),
  getDiagnostics: vi.fn(),
  getFlows: vi.fn(),
  listNodes: vi.fn(),
  getFlow: vi.fn(),
} as any;

function buildServer() {
  const s = new McpServer({ name: "test", version: "1.0" });
  registerResources(s, mockClient);
  return s;
}

async function readResource(uri: string) {
  const server = buildServer();
  const [cTrans, sTrans] = InMemoryTransport.createLinkedPair();
  await server.connect(sTrans);
  const client = new Client({ name: "t", version: "1.0" }, { capabilities: {} });
  await client.connect(cTrans);
  try {
    return await client.readResource({ uri });
  } finally {
    client.close().catch(() => {});
    server.close().catch(() => {});
  }
}

describe("registerResources", () => {
  it("registers settings resource", async () => {
    mockClient.getSettings.mockResolvedValue({ httpNodeRoot: "/" });
    const result = await readResource("node-red://runtime/settings");
    expect(result.contents[0].text).toContain("httpNodeRoot");
  });

  it("registers diagnostics resource", async () => {
    mockClient.getDiagnostics.mockResolvedValue({ version: "3.0" });
    const result = await readResource("node-red://runtime/diagnostics");
    expect(result.contents[0].text).toContain("3.0");
  });

  it("registers flows resource", async () => {
    mockClient.getFlows.mockResolvedValue([{ id: "t1", type: "tab", label: "Flow 1" }]);
    const result = await readResource("node-red://flows");
    expect(result.contents[0].text).toContain("Flow 1");
  });

  it("registers nodes resource", async () => {
    mockClient.listNodes.mockResolvedValue([{ id: "n1", name: "test-module" }]);
    const result = await readResource("node-red://nodes");
    expect(result.contents[0].text).toContain("test-module");
  });

  it("registers graph resource", async () => {
    mockClient.getFlows.mockResolvedValue([{ id: "t1", type: "tab", label: "Flow 1" }]);
    const result = await readResource("node-red://graph");
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.tabs).toHaveLength(1);
    expect(parsed.tabs[0].label).toBe("Flow 1");
  });

  it("registers flow/{id} template resource", async () => {
    mockClient.getFlow.mockResolvedValue({ id: "f1", label: "Test Flow", nodes: [] });
    const result = await readResource("node-red://flow/f1");
    expect(result.contents[0].text).toContain("Test Flow");
  });
});
