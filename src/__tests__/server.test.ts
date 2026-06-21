import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type NodeRedClient } from "../client/index.js";
import { createServer } from "../server/index.js";

const mockClient = {} as NodeRedClient;

describe("createServer", () => {
  it("returns a server and cleanup function", () => {
    const { server, cleanup } = createServer(mockClient);
    expect(server).toBeInstanceOf(McpServer);
    expect(typeof cleanup).toBe("function");
  });

  it("can be closed", async () => {
    const { server, cleanup } = createServer(mockClient);
    await server.close();
    cleanup();
  });
});
