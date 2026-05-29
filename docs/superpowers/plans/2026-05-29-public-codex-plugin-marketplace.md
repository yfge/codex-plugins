# Public Codex Plugin Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maintain this repository as a public Codex plugin marketplace index whose entries point at external open-source plugin repositories.

**Architecture:** `.agents/plugins/marketplace.json` is the catalog. Each plugin entry points at an external GitHub repository with either `source: "url"` for repository-root plugins or `source: "git-subdir"` for subdirectory plugins. This repo does not vendor plugin source code.

**Tech Stack:** Codex plugin marketplace JSON, Node.js ESM validation script, npm scripts, Markdown documentation.

---

## File Structure

- `.agents/plugins/marketplace.json`: public Codex marketplace catalog; can start with an empty `plugins` array.
- `scripts/validate-marketplace.mjs`: validates index entry shape and Git source metadata without fetching external repositories.
- `scripts/validate-marketplace.test.mjs`: Node test coverage for empty indexes, external root plugins, external subdirectory plugins, and unsafe paths.
- `README.md`: user-facing install and browse guide.
- `CONTRIBUTING.md`: contributor workflow for submitting external plugin repository entries.

### Task 1: Convert Marketplace To External Index

**Files:**
- Modify: `.agents/plugins/marketplace.json`
- Delete: `plugins/example-plugin/.codex-plugin/plugin.json`
- Delete: `plugins/example-plugin/skills/example/SKILL.md`

- [x] **Step 1: Allow empty index startup**

Set `.agents/plugins/marketplace.json` to:

```json
{
  "name": "yfge-codex-plugins",
  "interface": {
    "displayName": "YFGE Codex Plugins"
  },
  "plugins": []
}
```

- [x] **Step 2: Remove vendored example plugin files**

Delete the local example plugin files so this repository is clearly an index, not a plugin bundle repository.

### Task 2: Update Validator Behavior

**Files:**
- Modify: `scripts/validate-marketplace.test.mjs`
- Modify: `scripts/validate-marketplace.mjs`

- [x] **Step 1: Add failing tests for external entries**

Add tests proving that:

- the repository marketplace validates with zero indexed plugins
- a `git-subdir` entry pointing at an external GitHub repo validates without local plugin files
- a `url` entry pointing at an external GitHub repo root validates without local plugin files
- unsafe `git-subdir` paths are rejected

- [x] **Step 2: Implement external index validation**

Update the validator to:

- allow `plugins: []`
- support `source.source` values `git-subdir` and `url`
- require a GitHub HTTPS or SSH URL
- require `ref` or `sha`
- require safe `./` paths for `git-subdir`
- reject `source.path` for `url`
- keep policy and duplicate-id checks
- stop reading local plugin manifests

### Task 3: Update Public Documentation

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `package.json`
- Modify: `docs/superpowers/specs/2026-05-29-public-codex-plugin-marketplace-design.md`

- [x] **Step 1: Update README**

Describe the marketplace as a public Git-backed index and document external `git-subdir` and `url` entry examples.

- [x] **Step 2: Update CONTRIBUTING**

Explain that contributors keep plugin source code in their own public GitHub repositories and submit only catalog entries here.

- [x] **Step 3: Update package metadata and spec**

Use "index marketplace" wording and remove stale local-plugin assumptions from the design spec.

### Task 4: Verify And Publish

**Files:**
- Verify: all modified files

- [ ] **Step 1: Run tests**

```bash
npm test
```

Expected: 4 tests pass.

- [ ] **Step 2: Run validator**

```bash
npm run validate
```

Expected: `Marketplace validation passed: 0 plugins checked.`

- [ ] **Step 3: Commit and push**

```bash
git add .agents README.md CONTRIBUTING.md package.json scripts docs plugins
git commit -m "feat: index external plugin repositories"
git push
```

---

## Self-Review

- Spec coverage: external repo indexing, empty startup, root/subdir source formats, docs, and validation are covered.
- Placeholder scan: examples intentionally use `your-plugin` and `your-org` for contributor templates.
- Type consistency: marketplace names, source types, install policies, and validation command are consistent across docs and tests.
