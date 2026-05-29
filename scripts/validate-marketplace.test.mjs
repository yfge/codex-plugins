import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { validateMarketplace } from "./validate-marketplace.mjs";

test("validates the repository marketplace", async () => {
  const result = await validateMarketplace(process.cwd());

  assert.equal(result.pluginCount, 0);
  assert.deepEqual(result.pluginNames, []);
});

test("validates an external git-subdir plugin entry without local plugin files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "codex-marketplace-"));

  try {
    await mkdir(path.join(root, ".agents/plugins"), { recursive: true });
    await writeFile(
      path.join(root, ".agents/plugins/marketplace.json"),
      JSON.stringify(
        {
          name: "external-marketplace",
          interface: { displayName: "External Marketplace" },
          plugins: [
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
          ]
        },
        null,
        2
      )
    );

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
    await mkdir(path.join(root, ".agents/plugins"), { recursive: true });
    await writeFile(
      path.join(root, ".agents/plugins/marketplace.json"),
      JSON.stringify(
        {
          name: "external-marketplace",
          interface: { displayName: "External Marketplace" },
          plugins: [
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
          ]
        },
        null,
        2
      )
    );

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
    await mkdir(path.join(root, ".agents/plugins"), { recursive: true });
    await writeFile(
      path.join(root, ".agents/plugins/marketplace.json"),
      JSON.stringify(
        {
          name: "bad-marketplace",
          interface: { displayName: "Bad Marketplace" },
          plugins: [
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
          ]
        },
        null,
        2
      )
    );

    await assert.rejects(
      () => validateMarketplace(root),
      /bad-plugin: source\.path must start with \.\//
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
