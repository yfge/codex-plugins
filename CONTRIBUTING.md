# Contributing

This marketplace accepts open-source Codex plugins that can be distributed from this repository through the official Codex marketplace format.

## Plugin Layout

Add one plugin per directory:

```text
plugins/<plugin-name>/
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
  "homepage": "https://github.com/yfge/codex-plugins/tree/main/plugins/your-plugin",
  "repository": "https://github.com/yfge/codex-plugins",
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
    "websiteURL": "https://github.com/yfge/codex-plugins"
  }
}
```

Use strict semver for `version`. Manifest path fields such as `skills`, `mcpServers`, `apps`, and `hooks` must start with `./` and stay inside the plugin directory.

## Marketplace Entry

Add a matching entry to `.agents/plugins/marketplace.json`:

```json
{
  "name": "your-plugin",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/yfge/codex-plugins.git",
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

The marketplace `name`, `source.path`, plugin directory name, and manifest `name` must all use the same kebab-case plugin id.

## Validation

Run:

```bash
npm test
npm run validate
```

Validation must pass before a pull request is reviewed.

## Review Expectations

Submissions should be small, auditable, and useful without private services unless the plugin clearly documents its dependency. Keep bundled scripts minimal and explain any network, filesystem, or authentication behavior in the plugin description.

Do not submit secrets, credentials, private endpoints, generated dependency folders, or unrelated repository changes.
