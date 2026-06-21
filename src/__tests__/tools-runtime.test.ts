import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerRuntimeTools } from "../tools/runtime/index.js";

const mockClient = {
  getSettings: vi.fn(),
  getDiagnostics: vi.fn(),
  getFlowState: vi.fn(),
  setFlowState: vi.fn(),
} as any;

function buildServer() {
  const s = new McpServer({ name: "test", version: "1.0" });
  registerRuntimeTools(s, mockClient);
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

describe("Runtime Tools", () => {
  it("get-settings returns settings", async () => {
    mockClient.getSettings.mockResolvedValue({ httpNodeRoot: "/" });
    const r = await callTool("node-red-runtime-get-settings", {});
    expect(JSON.parse(r.content[0].text).httpNodeRoot).toBe("/");
  });

  it("get-diagnostics returns diagnostics", async () => {
    mockClient.getDiagnostics.mockResolvedValue({ version: "3.0.2" });
    const r = await callTool("node-red-runtime-get-diagnostics", {});
    expect(JSON.parse(r.content[0].text).version).toBe("3.0.2");
  });

  it("get-flow-state returns flow state", async () => {
    mockClient.getFlowState.mockResolvedValue({ flows: { f1: "running" } });
    const r = await callTool("node-red-runtime-get-flow-state", {});
    expect(JSON.parse(r.content[0].text).flows.f1).toBe("running");
  });

  it("set-flow-state updates flow state", async () => {
    mockClient.setFlowState.mockResolvedValue({ status: "ok" });
    const r = await callTool("node-red-runtime-set-flow-state", { state: { f1: "running" } });
    expect(JSON.parse(r.content[0].text).status).toBe("ok");
  });

  it("set-flow-state parses JSON string state", async () => {
    mockClient.setFlowState.mockResolvedValue({ status: "ok" });
    const r = await callTool("node-red-runtime-set-flow-state", { state: '{"f1":"stopped"}' });
    expect(JSON.parse(r.content[0].text).status).toBe("ok");
  });
});
