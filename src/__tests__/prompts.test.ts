import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { type NodeRedClient } from "../client/index.js";
import { registerPrompts } from "../prompts/index.js";

const mockClient = {} as NodeRedClient;

function buildServer() {
  const s = new McpServer({ name: "test", version: "1.0" });
  registerPrompts(s, mockClient);
  return s;
}

async function getPrompt(name: string, args: Record<string, unknown>) {
  const server = buildServer();
  const [cTrans, sTrans] = InMemoryTransport.createLinkedPair();
  await server.connect(sTrans);
  const client = new Client({ name: "t", version: "1.0" }, { capabilities: {} });
  await client.connect(cTrans);
  try {
    return await client.getPrompt({ name, arguments: args });
  } finally {
    client.close().catch(() => {});
    server.close().catch(() => {});
  }
}

describe("registerPrompts", () => {
  it("registers analyze-flow prompt", async () => {
    const result = await getPrompt("analyze-flow", { flowId: "f1" });
    expect(result.messages[0].content.text).toContain("Analyze flow f1");
  });

  it("registers repair-flow prompt", async () => {
    const result = await getPrompt("repair-flow", { flowId: "f2" });
    expect(result.messages[0].content.text).toContain("repair plan");
  });

  it("registers refactor-flow prompt", async () => {
    const result = await getPrompt("refactor-flow", { flowId: "f3" });
    expect(result.messages[0].content.text).toContain("Refactor flow f3");
  });

  it("all prompts return user role", async () => {
    for (const name of ["analyze-flow", "repair-flow", "refactor-flow"]) {
      const result = await getPrompt(name, { flowId: "f1" });
      expect(result.messages[0].role).toBe("user");
    }
  });
});
