import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

import { validateMarketplace } from "./validate-marketplace.mjs";

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, JSON.stringify(value, null, 2));
}

function agentEntryFromCodex(entry) {
  return {
    name: entry.name,
    source: cloneJson(entry.source),
    description: `${entry.name} test plugin.`,
    category: entry.category
  };
}

function cursorEntryFromCodex(entry) {
  return {
    name: entry.name,
    source:
      entry.source.source === "url" ? entry.source.url : entry.source.path,
    description: `${entry.name} test plugin.`
  };
}

async function writeMarketplaceSet(root, plugins) {
  await mkdir(path.join(root, ".agents/plugins"), { recursive: true });
  await mkdir(path.join(root, ".claude-plugin"), { recursive: true });
  await mkdir(path.join(root, ".cursor-plugin"), { recursive: true });

  await writeJson(path.join(root, ".agents/plugins/marketplace.json"), {
    name: "test-marketplace",
    interface: { displayName: "Test Marketplace" },
    plugins
  });

  await writeJson(path.join(root, ".claude-plugin/marketplace.json"), {
    name: "test-marketplace",
    version: "0.1.0",
    description: "Test marketplace.",
    owner: { name: "Test" },
    plugins: plugins.map(agentEntryFromCodex)
  });

  await writeJson(path.join(root, ".cursor-plugin/marketplace.json"), {
    name: "test-marketplace",
    owner: { name: "Test" },
    metadata: { description: "Test marketplace." },
    plugins: plugins.map(cursorEntryFromCodex)
  });
}

test("validates the repository marketplace", async () => {
  const result = await validateMarketplace(process.cwd());

  assert.equal(result.pluginCount, 2);
  assert.deepEqual(result.pluginNames, ["agent-harness-skills", "feishu"]);
  assert.deepEqual(result.runtimes.claude.pluginNames, [
    "agent-harness-skills",
    "feishu"
  ]);
  assert.deepEqual(result.runtimes.cursor.pluginNames, [
    "agent-harness-skills",
    "feishu"
  ]);
  assert.deepEqual(result.firstPartyPluginNames, ["feishu"]);
});

test("validates an external git-subdir plugin entry without local plugin files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "codex-marketplace-"));

  try {
    await writeMarketplaceSet(root, [
      {
        name: "external-plugin",
        source: {
          source: "git-subdir",
          url: "https://github.com/example/external-plugin.git",
          path: "./plugins/external-plugin",
          ref: "main"
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL"
        },
        category: "Productivity"
      }
    ]);

    const result = await validateMarketplace(root);

    assert.equal(result.pluginCount, 1);
    assert.deepEqual(result.pluginNames, ["external-plugin"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validates an external repository-root plugin entry", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "codex-marketplace-"));

  try {
    await writeMarketplaceSet(root, [
      {
        name: "root-plugin",
        source: {
          source: "url",
          url: "https://github.com/example/root-plugin.git",
          ref: "v1.0.0"
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL"
        },
        category: "Productivity"
      }
    ]);

    const result = await validateMarketplace(root);

    assert.equal(result.pluginCount, 1);
    assert.deepEqual(result.pluginNames, ["root-plugin"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects git-subdir plugin sources outside the referenced repository", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "codex-marketplace-"));

  try {
    await writeMarketplaceSet(root, [
      {
        name: "bad-plugin",
        source: {
          source: "git-subdir",
          url: "https://github.com/example/bad-plugin.git",
          path: "../bad-plugin",
          ref: "main"
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL"
        },
        category: "Productivity"
      }
    ]);

    await assert.rejects(
      () => validateMarketplace(root),
      /bad-plugin: source\.path must start with \.\//
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects Cursor marketplace object source descriptors", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "codex-marketplace-"));

  try {
    await writeMarketplaceSet(root, [
      {
        name: "external-plugin",
        source: {
          source: "url",
          url: "https://github.com/example/external-plugin.git",
          ref: "main"
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL"
        },
        category: "Productivity"
      }
    ]);

    const cursorMarketplacePath = path.join(
      root,
      ".cursor-plugin/marketplace.json"
    );
    await writeJson(cursorMarketplacePath, {
      name: "test-marketplace",
      owner: { name: "Test" },
      plugins: [
        {
          name: "external-plugin",
          source: {
            source: "url",
            url: "https://github.com/example/external-plugin.git",
            ref: "main"
          },
          description: "external-plugin test plugin."
        }
      ]
    });

    await assert.rejects(
      () => validateMarketplace(root),
      /external-plugin: cursor source must be a non-empty string/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("feishu OpenCode wrapper registers skills and MCP config", async () => {
  const wrapperPath = path.join(
    process.cwd(),
    "plugins/feishu/.opencode/plugins/feishu.js"
  );
  const wrapperUrl = `${pathToFileURL(wrapperPath).href}?test=${Date.now()}`;
  const wrapper = await import(wrapperUrl);
  const plugin = await wrapper.default();
  const config = {
    skills: { paths: [] },
    mcp: {
      feishu: {
        enabled: false,
        environment: {
          EXISTING: "1"
        }
      }
    }
  };

  await plugin.config(config);
  await plugin.config(config);

  const skillsDir = path.join(process.cwd(), "plugins/feishu/skills");
  const serverPath = path.join(process.cwd(), "plugins/feishu/src/server.mjs");

  assert.deepEqual(config.skills.paths, [skillsDir]);
  assert.deepEqual(config.mcp.feishu, {
    enabled: false,
    environment: {
      EXISTING: "1"
    },
    type: "local",
    command: ["node", serverPath]
  });
});
