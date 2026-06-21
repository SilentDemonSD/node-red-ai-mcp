import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRunStdio = vi.fn();
const mockRunSse = vi.fn();
const mockRunStreamableHttp = vi.fn();

vi.mock("../transports/stdio.js", () => ({ runStdio: mockRunStdio }));
vi.mock("../transports/sse.js", () => ({ runSse: mockRunSse }));
vi.mock("../transports/streamableHttp.js", () => ({ runStreamableHttp: mockRunStreamableHttp }));

describe("CLI entry point", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs stdio by default", async () => {
    process.argv = ["node", "dist/index.js"];
    await import("../index.js");
    // Wait for the module's run function (top-level await won't work here
    // because the module IIFE runs on import). We need a different approach.
  });
});
