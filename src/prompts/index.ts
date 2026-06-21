import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type NodeRedClient } from "../client/index.js";

export function registerPrompts(server: McpServer, _client: NodeRedClient): void {
  void _client;
  server.registerPrompt(
    "analyze-flow",
    {
      title: "Analyze Flow",
      description: "Analyze a Node-RED flow for risks, dependencies, and graph structure",
      argsSchema: {
        flowId: z.string().describe("Flow id or label"),
      },
    },
    async (args) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Analyze flow ${args.flowId} in the attached Node-RED runtime. Produce a concise review covering topology, sources, sinks, cycles, config dependencies, risky nodes, and deployment hazards. Use the Admin API data and recommend safe next steps only.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "repair-flow",
    {
      title: "Repair Flow",
      description: "Draft a repair plan for invalid or broken flow wiring",
      argsSchema: {
        flowId: z.string().describe("Flow id or label"),
      },
    },
    async (args) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Inspect flow ${args.flowId} and propose a repair plan. Identify invalid wires, missing nodes, duplicate ids, broken config references, and safe replacement steps. Keep the output operational and implementation-ready.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "refactor-flow",
    {
      title: "Refactor Flow",
      description: "Suggest a graph-aware refactor plan for a Node-RED flow",
      argsSchema: {
        flowId: z.string().describe("Flow id or label"),
      },
    },
    async (args) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Refactor flow ${args.flowId} into semantic groups or subflows if it improves readability, reuse, or safe deployment. Recommend group boundaries, naming, and any node-set or template reuse opportunities.`,
          },
        },
      ],
    })
  );
}
