# Public Codex Plugin Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, open-source Codex plugin marketplace repo that users can add with `codex plugin marketplace add https://github.com/yfge/codex-plugins.git`.

**Architecture:** This is a static Git-backed marketplace. `.agents/plugins/marketplace.json` is the catalog, `plugins/example-plugin` is a complete sample plugin, and `scripts/validate-marketplace.mjs` is the local gate that checks marketplace and manifest consistency before changes are merged.

**Tech Stack:** Codex plugin marketplace JSON, Node.js ESM validation script, npm scripts, Markdown documentation.

---

## File Structure

- Create `.agents/plugins/marketplace.json`: public Codex marketplace catalog.
- Create `plugins/example-plugin/.codex-plugin/plugin.json`: example plugin manifest.
- Create `plugins/example-plugin/skills/example/SKILL.md`: bundled sample skill.
- Create `scripts/validate-marketplace.test.mjs`: behavior tests for the validator.
- Create `scripts/validate-marketplace.mjs`: Node validator for catalog and plugin manifests.
- Create `package.json`: npm metadata and `validate` command.
- Create `README.md`: user-facing installation and browsing guide.
- Create `CONTRIBUTING.md`: contributor workflow and metadata requirements.
- Create `LICENSE`: MIT license.
- Modify `docs/superpowers/specs/2026-05-29-public-codex-plugin-marketplace-design.md`: use canonical SSH Git URL.

### Task 1: Marketplace Catalog And Example Plugin

**Files:**
- Create: `.agents/plugins/marketplace.json`
- Create: `plugins/example-plugin/.codex-plugin/plugin.json`
- Create: `plugins/example-plugin/skills/example/SKILL.md`

- [ ] **Step 1: Create the marketplace catalog**

Write `.agents/plugins/marketplace.json`:

```json
{
  "name": "yfge-codex-plugins",
  "interface": {
    "displayName": "YFGE Codex Plugins"
  },
  "plugins": [
    {
      "name": "example-plugin",
      "source": {
        "source": "git-subdir",
        "url": "https://github.com/yfge/codex-plugins.git",
        "path": "./plugins/example-plugin",
        "ref": "main"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Productivity"
    }
  ]
}
```

- [ ] **Step 2: Create the example plugin manifest**

Write `plugins/example-plugin/.codex-plugin/plugin.json`:

```json
{
  "name": "example-plugin",
  "version": "0.1.0",
  "description": "A minimal example plugin for the YFGE Codex plugin marketplace.",
  "author": {
    "name": "YFGE",
    "url": "https://github.com/yfge"
  },
  "homepage": "https://github.com/yfge/codex-plugins/tree/main/plugins/example-plugin",
  "repository": "https://github.com/yfge/codex-plugins",
  "license": "MIT",
  "keywords": ["codex", "plugin", "example"],
  "skills": "./skills/",
  "interface": {
    "displayName": "Example Plugin",
    "shortDescription": "Minimal sample plugin for marketplace authors.",
    "longDescription": "A small plugin that demonstrates the required Codex plugin structure, manifest metadata, and bundled skill layout for this marketplace.",
    "developerName": "YFGE",
    "category": "Productivity",
    "capabilities": ["Instructions"],
    "websiteURL": "https://github.com/yfge/codex-plugins",
    "defaultPrompt": [
      "Use the example plugin to show the expected response format."
    ],
    "brandColor": "#10A37F"
  }
}
```

- [ ] **Step 3: Create the bundled skill**

Write `plugins/example-plugin/skills/example/SKILL.md`:

```markdown
---
name: example
description: Demonstrate that the example plugin is installed and available.
---

When invoked, briefly confirm that the Example Plugin skill is available. Then show a compact checklist for adding a real plugin to this marketplace:

1. Create `plugins/<plugin-name>/.codex-plugin/plugin.json`.
2. Add bundled skills, apps, MCP servers, or hooks at the plugin root.
3. Add a matching entry to `.agents/plugins/marketplace.json`.
4. Run `npm run validate`.
```

### Task 2: Validation Tooling

**Files:**
- Create: `package.json`
- Create: `scripts/validate-marketplace.test.mjs`
- Create: `scripts/validate-marketplace.mjs`

- [ ] **Step 1: Create npm metadata**

Write `package.json`:

```json
{
  "name": "codex-plugins",
  "version": "0.1.0",
  "private": true,
  "description": "Public Git-backed marketplace for OpenAI Codex plugins.",
  "type": "module",
  "scripts": {
    "test": "node --test scripts/validate-marketplace.test.mjs",
    "validate": "node scripts/validate-marketplace.mjs"
  },
  "engines": {
    "node": ">=18"
  }
}
```

- [ ] **Step 2: Write validator**

Write `scripts/validate-marketplace.test.mjs` first with tests for the valid repository and for invalid plugin source paths. Run it before creating the validator and confirm it fails because `scripts/validate-marketplace.mjs` does not exist.

- [ ] **Step 3: Write validator**

Write `scripts/validate-marketplace.mjs` with exported functions that parse JSON, validate required objects, verify `git-subdir` source entries, confirm plugin directories and manifests exist, check manifest metadata, and reject unsafe manifest paths.

- [ ] **Step 4: Run tests and validator and verify pass**

Run:

```bash
npm test
npm run validate
```

Expected output includes:

```text
tests 2
pass 2
Marketplace validation passed: 1 plugin checked.
```

### Task 3: Documentation And License

**Files:**
- Create: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `LICENSE`

- [ ] **Step 1: Write README**

Include the install command:

```bash
codex plugin marketplace add https://github.com/yfge/codex-plugins.git
```

Document `/plugins`, `codex plugin marketplace upgrade yfge-codex-plugins`, `codex plugin marketplace remove yfge-codex-plugins`, the current plugin list, and a non-affiliation note.

- [ ] **Step 2: Write CONTRIBUTING**

Document plugin directory layout, manifest requirements, marketplace entry shape, validation command, and review expectations for open-source submissions.

- [ ] **Step 3: Write MIT LICENSE**

Use the MIT license with copyright holder `YFGE`.

### Task 4: Git Remote, Verification, Commit, And Push

**Files:**
- Modify: repository git config
- Verify: all files created in Tasks 1-3

- [ ] **Step 1: Configure remote**

Run:

```bash
git remote add origin git@github.com:yfge/codex-plugins.git
```

If `origin` already exists, run:

```bash
git remote set-url origin git@github.com:yfge/codex-plugins.git
```

- [ ] **Step 2: Run final verification**

Run:

```bash
npm run validate
git status --short
```

Expected: validator passes, and git status only shows intended new or modified files before commit.

- [ ] **Step 3: Commit implementation**

Run:

```bash
git add .agents plugins scripts package.json README.md CONTRIBUTING.md LICENSE docs/superpowers/specs/2026-05-29-public-codex-plugin-marketplace-design.md docs/superpowers/plans/2026-05-29-public-codex-plugin-marketplace.md
git commit -m "feat: scaffold public Codex plugin marketplace"
```

- [ ] **Step 4: Push to GitHub**

Run:

```bash
git push -u origin main
```

Expected: push succeeds and the remote repository has the marketplace files.

---

## Self-Review

- Spec coverage: marketplace catalog, example plugin, docs, validation, Git URL, and open-source defaults are covered.
- Placeholder scan: no `TBD`, `TODO`, or unresolved owner placeholders are present.
- Type consistency: marketplace names, plugin names, paths, and validation command are consistent across tasks.
