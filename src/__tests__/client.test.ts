import { describe, it, expect, vi, beforeEach } from "vitest";
import { NodeRedClient } from "../client/index.js";
import axios from "axios";

vi.mock("axios");

const mockAxiosInstance = {
  request: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  (axios.create as ReturnType<typeof vi.fn>).mockReturnValue(mockAxiosInstance);
});

describe("NodeRedClient", () => {
  function createClient(token?: string) {
    return new NodeRedClient({ baseUrl: "http://localhost:1880", accessToken: token });
  }

  describe("request", () => {
    it("sends GET request and returns data", async () => {
      mockAxiosInstance.request.mockResolvedValue({ status: 200, data: { rev: "abc" } });
      const client = createClient();
      const result = await client.getFlows();
      expect(result).toEqual({ rev: "abc" });
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: "GET", url: "/flows" })
      );
    });

    it("adds bearer token when set", async () => {
      mockAxiosInstance.request.mockResolvedValue({ status: 200, data: {} });
      const client = createClient("tok123");
      await client.getSettings();
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer tok123" }),
        })
      );
    });

    it("throws on non-2xx status", async () => {
      mockAxiosInstance.request.mockResolvedValue({ status: 401, data: "Unauthorized" });
      const client = createClient();
      await expect(client.getFlows()).rejects.toThrow("Node-RED API error (status 401)");
    });
  });

  describe("auth", () => {
    it("login throws without credentials", async () => {
      mockAxiosInstance.request.mockResolvedValue({ status: 200, data: { type: "password" } });
      const client = createClient();
      await expect(client.login()).rejects.toThrow("Missing credentials");
    });

    it("login performs token exchange", async () => {
      mockAxiosInstance.request
        .mockResolvedValueOnce({ status: 200, data: { type: "credentials" } })
        .mockResolvedValueOnce({ status: 200, data: { access_token: "tok1", token_type: "bearer", expires_in: 3600 } });
      const client = createClient();
      const result = await client.login({ username: "admin", password: "pass" });
      expect(result.access_token).toBe("tok1");
      expect(client.token).toBe("tok1");
    });

    it("revoke clears token", async () => {
      mockAxiosInstance.request.mockResolvedValue({ status: 200, data: {} });
      const client = createClient("my-token");
      await client.revoke();
      expect(client.token).toBe("");
    });
  });

  describe("flows", () => {
    it("getFlows calls correct endpoint", async () => {
      mockAxiosInstance.request.mockResolvedValue({ status: 200, data: [] });
      const client = createClient();
      await client.getFlows();
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: "GET", url: "/flows" })
      );
    });

    it("getFlow calls /flow/:id", async () => {
      mockAxiosInstance.request.mockResolvedValue({ status: 200, data: { id: "f1", nodes: [] } });
      const client = createClient();
      const result = await client.getFlow("f1");
      expect(result.id).toBe("f1");
    });

    it("createFlow posts to /flow", async () => {
      mockAxiosInstance.request.mockResolvedValue({ status: 200, data: { id: "new", nodes: [] } });
      const client = createClient("tok");
      const doc = { id: "new", label: "Test", nodes: [] };
      await client.createFlow(doc);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: "POST", url: "/flow" })
      );
    });
  });

  describe("nodes", () => {
    it("listNodes calls GET /nodes", async () => {
      mockAxiosInstance.request.mockResolvedValue({ status: 200, data: [] });
      const client = createClient();
      await client.listNodes();
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: "GET", url: "/nodes" })
      );
    });
  });
});
