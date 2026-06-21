import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerAuthTools } from "../tools/auth/index.js";

const mockClient = {
  getAuthScheme: vi.fn(),
  login: vi.fn(),
  revoke: vi.fn(),
} as any;

function buildServer() {
  const s = new McpServer({ name: "test", version: "1.0" });
  registerAuthTools(s, mockClient);
  return s;
}

async function callTool(name: string, args: Record<string, unknown>) {
  const server = buildServer();
  const [cTrans, sTrans] = InMemoryTransport.createLinkedPair();
  await server.connect(sTrans);
  const client = new Client({ name: "t", version: "1.0" }, { capabilities: {} });
  await client.connect(cTrans);
  try {
    const result = await client.callTool({ name, arguments: args });
    return result;
  } finally {
    client.close().catch(() => {});
    server.close().catch(() => {});
  }
}

describe("Auth Tools", () => {
  it("get-scheme returns auth scheme", async () => {
    mockClient.getAuthScheme.mockResolvedValue({ type: "credentials" });
    const r = await callTool("node-red-auth-get-scheme", {});
    expect(JSON.parse(r.content[0].text).type).toBe("credentials");
  });

  it("login exchanges credentials for token", async () => {
    mockClient.login.mockResolvedValue({ access_token: "tok1", token_type: "bearer", expires_in: 3600 });
    const r = await callTool("node-red-auth-login", { username: "admin", password: "pass" });
    expect(JSON.parse(r.content[0].text).access_token).toBe("tok1");
  });

  it("revoke returns success", async () => {
    mockClient.revoke.mockResolvedValue({ revoked: true });
    const r = await callTool("node-red-auth-revoke", { token: "tok1" });
    expect(JSON.parse(r.content[0].text).revoked).toBe(true);
  });

  it("revoke returns error when endpoint unavailable", async () => {
    mockClient.revoke.mockRejectedValue(new Error("Cannot POST /auth/revoke"));
    const r = await callTool("node-red-auth-revoke", { token: "tok1" });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).error).toContain("not available");
  });
});
