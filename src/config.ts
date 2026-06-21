import { type ClientOptions, NodeRedClient } from "./client/index.js";

export interface McpConfig {
  nodeRedUrl: string;
  accessToken: string;
  username: string;
  password: string;
  ssePort: number;
  streamableHttpPort: number;
}

function readEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function loadConfig(): McpConfig {
  const baseUrl = readEnv("NODE_RED_URL", "http://localhost:1880");
  const token = readEnv("NODE_RED_TOKEN") || readEnv("NODE_RED_ACCESS_TOKEN");
  const username = readEnv("NODE_RED_USERNAME");
  const password = readEnv("NODE_RED_PASSWORD");
  const mcpPort = readIntEnv("MCP_SERVER_PORT", 0);

  return {
    nodeRedUrl: baseUrl,
    accessToken: token,
    username,
    password,
    ssePort: mcpPort || readIntEnv("PORT", 3001),
    streamableHttpPort: mcpPort || readIntEnv("PORT", 3002),
  };
}

export function createNodeRedClient(config?: McpConfig): NodeRedClient {
  const cfg = config ?? loadConfig();
  const opts: ClientOptions = {
    baseUrl: cfg.nodeRedUrl,
    accessToken: cfg.accessToken,
    username: cfg.username || undefined,
    password: cfg.password || undefined,
  };
  return new NodeRedClient(opts);
}
