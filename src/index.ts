#!/usr/bin/env node

const args = process.argv.slice(2);
const transport = args[0] || "stdio";

async function run() {
  try {
    switch (transport) {
      case "stdio": {
        const mod = await import("./transports/stdio.js");
        await mod.runStdio();
        break;
      }
      case "sse": {
        const mod = await import("./transports/sse.js");
        await mod.runSse();
        break;
      }
      case "streamableHttp": {
        const mod = await import("./transports/streamableHttp.js");
        await mod.runStreamableHttp();
        break;
      }
      default:
        console.error("Usage: node-red-mcp [stdio|sse|streamableHttp]");
        process.exit(1);
    }
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

run();
