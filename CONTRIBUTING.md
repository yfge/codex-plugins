# Contributing

This marketplace accepts open-source agent plugins by indexing public GitHub repositories. Codex is the primary catalog, and every accepted plugin should also declare its Claude Code, Cursor, and OpenCode support surface when practical.

Plugin source code should usually stay in the plugin author's repository; this repository stores marketplace catalog entries. First-party plugins maintained by YFGE may live under `plugins/<plugin-name>/` and be indexed from this repository with a `git-subdir` source.

## Plugin Repository Layout

Your external plugin repository, or first-party plugin subdirectory in this repository, must contain a Codex plugin manifest at the plugin root or at the subdirectory referenced by the marketplace entry. First-party plugins in this repository must also include Claude Code, Cursor, and OpenCode entrypoints:

```text
<plugin-root>/
  .codex-plugin/
    plugin.json
  .claude-plugin/
    plugin.json
  .cursor-plugin/
    plugin.json
  .opencode/
    plugins/
      <plugin-name>.js
  skills/
    <skill-name>/
      SKILL.md
```

Only runtime manifests belong inside `.codex-plugin/`, `.claude-plugin/`, and `.cursor-plugin/`. Keep `skills/`, `.mcp.json`, `.app.json`, `hooks/`, and `assets/` at the plugin root.

OpenCode does not consume this repository's marketplace JSON files directly. If the plugin supports OpenCode, provide a local plugin wrapper under `.opencode/plugins/` and document any required clone, symlink, or `opencode.json` MCP setup.

## Manifest Requirements

The Codex plugin manifest must include:

```json
{
  "name": "your-plugin",
  "version": "0.1.0",
  "description": "Short plugin description.",
  "author": {
    "name": "Your name or team",
    "url": "https://github.com/your-org"
  },
  "homepage": "https://github.com/your-org/your-plugin",
  "repository": "https://github.com/your-org/your-plugin",
  "license": "MIT",
  "keywords": ["codex", "plugin"],
  "skills": "./skills/",
  "interface": {
    "displayName": "Your Plugin",
    "shortDescription": "Brief user-facing subtitle.",
    "longDescription": "Longer details for the plugin page.",
    "developerName": "Your name or team",
    "category": "Productivity",
    "capabilities": ["Instructions"],
    "websiteURL": "https://github.com/your-org/your-plugin"
  }
}
```

Claude Code and Cursor manifests should use the same `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`, `skills`, and MCP pointer where the runtime supports those fields. Cursor manifests should also include `displayName`, `category`, and useful `tags`.

Use strict semver for `version`. Manifest path fields such as `skills`, `mcpServers`, `apps`, and `hooks` must start with `./` and stay inside the plugin directory.

## Marketplace Entries

Add one matching entry to each marketplace index:

- Codex: `.agents/plugins/marketplace.json`
- Claude Code: `.claude-plugin/marketplace.json`
- Cursor: `.cursor-plugin/marketplace.json`

Use the same plugin id in every index. Use `git-subdir` in the Codex catalog when the plugin lives below the repository root:

```json
{
  "name": "your-plugin",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/your-org/your-plugin.git",
    "path": "./plugins/your-plugin",
    "ref": "main"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Productivity"
}
```

Use `url` in the Codex catalog when the plugin manifest lives at the external repository root:

```json
{
  "name": "your-plugin",
  "source": {
    "source": "url",
    "url": "https://github.com/your-org/your-plugin.git",
    "ref": "main"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Productivity"
}
```

Claude Code and Cursor entries can use a local source string for first-party plugins in this repository, for example:

```json
{
  "name": "your-plugin",
  "source": "./plugins/your-plugin",
  "description": "Short plugin description."
}
```

For external repositories, mirror the pinned Git source descriptor from the Codex catalog where the runtime schema supports it. Cursor's current marketplace schema uses a string source, so use the public Git URL there.

The marketplace `name` and plugin manifest `name` must use the same kebab-case plugin id. Use HTTPS GitHub URLs for public installability. Include either `ref` or `sha`; `sha` is preferred for reproducible entries after review.

## Validation

Run:

```bash
npm test
npm run validate
```

Validation must pass before a pull request is reviewed. The validator checks all marketplace indexes, cross-runtime plugin id consistency, first-party runtime manifests, OpenCode wrappers, and safe source paths. It does not fetch external repositories.

## Review Expectations

Submissions should be small, auditable, and useful without private services unless the plugin clearly documents its dependency. Explain any network, filesystem, runtime code execution, or authentication behavior in the external plugin README and manifest.

Do not submit secrets, credentials, private endpoints, generated dependency folders, vendored plugin code, or unrelated repository changes.
