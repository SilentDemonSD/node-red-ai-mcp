import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { FlowsResponse, FlowDocument } from "../graph/types.js";

export interface ClientOptions {
  baseUrl: string;
  accessToken?: string;
  username?: string;
  password?: string;
}

export interface AuthScheme {
  type?: string;
  prompt?: string;
  client_id?: string;
  scope?: string;
  [key: string]: unknown;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  [key: string]: unknown;
}

export interface AuthCredentials {
  client_id?: string;
  grant_type?: string;
  scope?: string;
  username?: string;
  password?: string;
}

function formatError(status: number | undefined, body: unknown, fallback?: string): string {
  const details = body
    ? typeof body === "string"
      ? body
      : JSON.stringify(body)
    : fallback || "Unknown error";
  return `Node-RED API error${status ? ` (status ${status})` : ""}: ${details}`;
}

export class NodeRedClient {
  private readonly baseUrl: string;
  private http: AxiosInstance;
  token: string;
  private username?: string;
  private password?: string;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.accessToken ?? "";
    this.username = options.username;
    this.password = options.password;
    this.http = axios.create({
      baseURL: this.baseUrl,
      validateStatus: () => true,
    });
  }

  private async request<T = unknown>(
    method: string,
    endpoint: string,
    data?: unknown,
    options?: { formUrlEncoded?: boolean }
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    let body: unknown = data;
    if (options?.formUrlEncoded && data && typeof data === "object") {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
        if (v !== undefined && v !== null) params.set(k, String(v));
      }
      body = params;
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    } else if (data !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const config: AxiosRequestConfig = {
      method: method as AxiosRequestConfig["method"],
      url: endpoint,
      headers,
      data: body,
    };

    const response = await this.http.request<T>(config);
    if (response.status >= 400) {
      throw new Error(formatError(response.status, response.data));
    }
    return response.data;
  }

  /* ───── Auth ───── */

  async getAuthScheme(): Promise<AuthScheme> {
    return this.request("GET", "/auth/login");
  }

  async login(credentials?: AuthCredentials): Promise<TokenResponse> {
    const scheme = await this.getAuthScheme();
    if (!scheme || Object.keys(scheme).length === 0) {
      return { access_token: "", token_type: "", expires_in: 0 };
    }

    const payload = {
      client_id: credentials?.client_id || "node-red-admin",
      grant_type: credentials?.grant_type || "password",
      scope: credentials?.scope || "*",
      username: credentials?.username || this.username,
      password: credentials?.password || this.password,
    };

    if (!payload.username || !payload.password) {
      throw new Error(
        "Missing credentials. Provide username/password or set NODE_RED_USERNAME and NODE_RED_PASSWORD."
      );
    }

    const tokenResponse = await this.request<TokenResponse>("POST", "/auth/token", payload, {
      formUrlEncoded: true,
    });

    this.token = tokenResponse.access_token;
    return tokenResponse;
  }

  async revoke(token?: string): Promise<unknown> {
    const tokenToRevoke = token || this.token;
    if (!tokenToRevoke) throw new Error("No access token available to revoke.");
    const result = await this.request<unknown>("POST", "/auth/revoke", { token: tokenToRevoke }, { formUrlEncoded: true });
    if (tokenToRevoke === this.token) this.token = "";
    return result;
  }

  /* ───── Runtime ───── */

  async getSettings(): Promise<Record<string, unknown>> {
    return this.request("GET", "/settings");
  }

  async getDiagnostics(): Promise<Record<string, unknown>> {
    return this.request("GET", "/diagnostics");
  }

  async getFlowState(): Promise<unknown> {
    return this.request("GET", "/flows/state");
  }

  async setFlowState(state: unknown): Promise<unknown> {
    const payload = state && typeof state === "object" && !Array.isArray(state)
      ? state
      : { state };
    return this.request("POST", "/flows/state", payload);
  }

  /* ───── Flows ───── */

  async getFlows(): Promise<FlowsResponse> {
    return this.request("GET", "/flows");
  }

  async getFlow(id: string): Promise<FlowDocument> {
    return this.request("GET", `/flow/${encodeURIComponent(id)}`);
  }

  async createFlow(flow: FlowDocument): Promise<FlowDocument> {
    return this.request("POST", "/flow", flow);
  }

  async updateFlow(id: string, flow: FlowDocument): Promise<FlowDocument> {
    return this.request("PUT", `/flow/${encodeURIComponent(id)}`, flow);
  }

  async deleteFlow(id: string): Promise<unknown> {
    return this.request("DELETE", `/flow/${encodeURIComponent(id)}`);
  }

  /* ───── Nodes ───── */

  async listNodes(): Promise<unknown> {
    return this.request("GET", "/nodes");
  }

  async installNode(payload: Record<string, unknown>): Promise<unknown> {
    return this.request("POST", "/nodes", payload);
  }

  async getNodeModule(module: string): Promise<unknown> {
    return this.request("GET", `/nodes/${encodeURIComponent(module)}`);
  }

  async toggleNodeModule(module: string, enabled: boolean): Promise<unknown> {
    return this.request("PUT", `/nodes/${encodeURIComponent(module)}`, { enabled });
  }

  async removeNodeModule(module: string): Promise<unknown> {
    return this.request("DELETE", `/nodes/${encodeURIComponent(module)}`);
  }

  async getNodeSet(module: string, set: string): Promise<unknown> {
    return this.request("GET", `/nodes/${encodeURIComponent(module)}/${encodeURIComponent(set)}`);
  }

  async toggleNodeSet(module: string, set: string, enabled: boolean): Promise<unknown> {
    return this.request("PUT", `/nodes/${encodeURIComponent(module)}/${encodeURIComponent(set)}`, { enabled });
  }

  /* ───── Inject ───── */

  async inject(nodeId: string): Promise<unknown> {
    return this.request("POST", `/inject/${encodeURIComponent(nodeId)}`, {});
  }
}
