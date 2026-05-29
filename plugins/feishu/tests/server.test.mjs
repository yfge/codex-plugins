import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

function startServer() {
  const child = spawn(process.execPath, ["src/server.mjs"], {
    cwd: new URL("..", import.meta.url),
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env }
  });
  const pending = new Map();
  let buffer = "";

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", chunk => {
    buffer += chunk;
    while (true) {
      const index = buffer.indexOf("\n");
      if (index === -1) break;
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (!line.trim()) continue;
      const message = JSON.parse(line);
      const resolver = pending.get(message.id);
      if (resolver) {
        pending.delete(message.id);
        resolver(message);
      }
    }
  });

  let id = 0;
  function request(method, params = {}) {
    id += 1;
    const requestId = id;
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params })}\n`);
    return new Promise(resolve => pending.set(requestId, resolve));
  }

  return {
    child,
    request,
    async stop() {
      child.stdin.end();
      child.kill();
      await once(child, "exit");
    }
  };
}

test("speaks MCP JSON-line protocol and exposes Feishu tools", async () => {
  const server = startServer();
  try {
    const init = await server.request("initialize", { protocolVersion: "2025-06-18" });
    assert.equal(init.result.serverInfo.name, "feishu");

    const listed = await server.request("tools/list");
    const toolNames = listed.result.tools.map(tool => tool.name);
    assert.ok(toolNames.includes("feishu_docs_create"));
    assert.ok(toolNames.includes("feishu_send_webhook"));
    assert.ok(toolNames.includes("feishu_bitable_search_records"));
    assert.ok(toolNames.includes("feishu_wiki_search"));

    const status = await server.request("tools/call", {
      name: "feishu_auth_status",
      arguments: { check_remote: false }
    });
    assert.equal(status.result.isError, false);
    assert.match(status.result.content[0].text, /configured/);
  } finally {
    await server.stop();
  }
});
