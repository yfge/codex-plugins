# Contributing

This marketplace accepts open-source Codex plugins by indexing public GitHub repositories. Plugin source code should usually stay in the plugin author's repository; this repository stores the marketplace catalog entry. First-party plugins maintained by YFGE may live under `plugins/<plugin-name>/` and be indexed from this repository with a `git-subdir` source.

## Plugin Repository Layout

Your external plugin repository, or first-party plugin subdirectory in this repository, must contain a Codex plugin manifest at the plugin root or at the subdirectory referenced by the marketplace entry:

```text
<plugin-root>/
  .codex-plugin/
    plugin.json
  skills/
    <skill-name>/
      SKILL.md
```

Only `.codex-plugin/plugin.json` belongs inside `.codex-plugin/`. Keep `skills/`, `.mcp.json`, `.app.json`, `hooks/`, and `assets/` at the plugin root.

## Manifest Requirements

Each plugin manifest must include:

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

Use strict semver for `version`. Manifest path fields such as `skills`, `mcpServers`, `apps`, and `hooks` must start with `./` and stay inside the plugin directory.

## Marketplace Entry

Add one matching entry to `.agents/plugins/marketplace.json`. Use `git-subdir` when the plugin lives below the repository root:

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

Use `url` when the plugin manifest lives at the external repository root:

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

The marketplace `name` and plugin manifest `name` must use the same kebab-case plugin id. Use HTTPS GitHub URLs for public installability. Include either `ref` or `sha`; `sha` is preferred for reproducible entries after review.

## Validation

Run:

```bash
npm test
npm run validate
```

Validation must pass before a pull request is reviewed. The validator checks the index entry shape and does not fetch external repositories.

## Review Expectations

Submissions should be small, auditable, and useful without private services unless the plugin clearly documents its dependency. Explain any network, filesystem, or authentication behavior in the external plugin README and manifest.

Do not submit secrets, credentials, private endpoints, generated dependency folders, vendored plugin code, or unrelated repository changes.
