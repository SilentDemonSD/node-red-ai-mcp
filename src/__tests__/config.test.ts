import { describe, it, expect, beforeEach } from "vitest";

const OLD_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...OLD_ENV };
  for (const key of ["NODE_RED_URL", "NODE_RED_TOKEN", "NODE_RED_ACCESS_TOKEN", "NODE_RED_USERNAME", "NODE_RED_PASSWORD", "MCP_SERVER_PORT", "PORT"]) {
    delete process.env[key];
  }
});

const reexports = await import("../config.js");

describe("loadConfig", () => {
  it("uses defaults when no env vars set", () => {
    const config = reexports.loadConfig();
    expect(config.nodeRedUrl).toBe("http://localhost:1880");
    expect(config.accessToken).toBe("");
    expect(config.username).toBe("");
    expect(config.password).toBe("");
    expect(config.ssePort).toBe(3001);
    expect(config.streamableHttpPort).toBe(3002);
  });

  it("reads NODE_RED_URL", () => {
    process.env.NODE_RED_URL = "http://example.com:1880";
    const config = reexports.loadConfig();
    expect(config.nodeRedUrl).toBe("http://example.com:1880");
  });

  it("reads NODE_RED_TOKEN", () => {
    process.env.NODE_RED_TOKEN = "tok123";
    const config = reexports.loadConfig();
    expect(config.accessToken).toBe("tok123");
  });

  it("reads NODE_RED_ACCESS_TOKEN as fallback", () => {
    process.env.NODE_RED_ACCESS_TOKEN = "fallback-tok";
    const config = reexports.loadConfig();
    expect(config.accessToken).toBe("fallback-tok");
  });

  it("NODE_RED_TOKEN takes precedence over NODE_RED_ACCESS_TOKEN", () => {
    process.env.NODE_RED_TOKEN = "primary";
    process.env.NODE_RED_ACCESS_TOKEN = "fallback";
    const config = reexports.loadConfig();
    expect(config.accessToken).toBe("primary");
  });

  it("reads NODE_RED_USERNAME and NODE_RED_PASSWORD", () => {
    process.env.NODE_RED_USERNAME = "admin";
    process.env.NODE_RED_PASSWORD = "pass";
    const config = reexports.loadConfig();
    expect(config.username).toBe("admin");
    expect(config.password).toBe("pass");
  });

  it("MCP_SERVER_PORT overrides default ports", () => {
    process.env.MCP_SERVER_PORT = "5000";
    const config = reexports.loadConfig();
    expect(config.ssePort).toBe(5000);
    expect(config.streamableHttpPort).toBe(5000);
  });

  it("uses PORT when MCP_SERVER_PORT is not set", () => {
    process.env.PORT = "4000";
    const config = reexports.loadConfig();
    expect(config.ssePort).toBe(4000);
    expect(config.streamableHttpPort).toBe(4000);
  });

  it("handles invalid integer env vars gracefully", () => {
    process.env.MCP_SERVER_PORT = "not-a-number";
    const config = reexports.loadConfig();
    expect(config.ssePort).toBe(3001);
  });
});

describe("createNodeRedClient", () => {
  it("returns a NodeRedClient instance", () => {
    const client = reexports.createNodeRedClient({
      nodeRedUrl: "http://localhost:1880",
      accessToken: "",
      username: "",
      password: "",
      ssePort: 3001,
      streamableHttpPort: 3002,
    });
    expect(client).toBeDefined();
    expect(typeof client.getFlows).toBe("function");
  });

  it("uses loadConfig when no config provided", () => {
    process.env.NODE_RED_URL = "http://test:1880";
    const client = reexports.createNodeRedClient();
    expect(client).toBeDefined();
  });
});
