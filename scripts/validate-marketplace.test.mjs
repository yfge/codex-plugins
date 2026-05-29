import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { validateMarketplace } from "./validate-marketplace.mjs";

test("validates the repository marketplace", async () => {
  const result = await validateMarketplace(process.cwd());

  assert.equal(result.pluginCount, 1);
  assert.deepEqual(result.pluginNames, ["example-plugin"]);
});

test("rejects marketplace plugin sources outside ./plugins", async () => {
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
                url: "https://github.com/yfge/codex-plugins.git",
                path: "./bad-plugin",
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
      /bad-plugin: source\.path must start with \.\/plugins\//
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
