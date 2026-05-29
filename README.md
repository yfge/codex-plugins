# YFGE Codex Plugins

Public Git-backed index marketplace for OpenAI Codex plugins.

This repository follows the Codex plugin marketplace format. It is not affiliated with OpenAI.

## Install

Add this marketplace to Codex:

```bash
codex plugin marketplace add https://github.com/yfge/codex-plugins.git
```

Maintainers can use the SSH remote for pushing changes:

```bash
git@github.com:yfge/codex-plugins.git
```

## Browse Plugins

Open Codex in a project, then type:

```text
/plugins
```

Choose **YFGE Codex Plugins** from the marketplace tabs, inspect a plugin, then install or enable it from the Codex plugin browser.

## Update

Refresh the marketplace snapshot:

```bash
codex plugin marketplace upgrade yfge-codex-plugins
```

## Remove

Remove the marketplace from Codex:

```bash
codex plugin marketplace remove yfge-codex-plugins
```

## Plugins

| Plugin | Category | Description |
| --- | --- | --- |
| `agent-harness-skills` | Coding | Reusable skills for building agent-ready repository harnesses. |
| `feishu` | Productivity | Feishu/Lark tools for docs, notifications, Bitable, and Wiki knowledge bases. |

## Validate

Run the repository checks before submitting changes:

```bash
npm test
npm run validate
```

The validator checks the marketplace catalog, external Git source descriptors, source paths, install policies, and duplicate plugin ids.

## Add A Plugin

Prefer keeping plugin source code in its own public GitHub repository and adding only an index entry to `.agents/plugins/marketplace.json`. First-party plugins maintained with this marketplace may also live under `plugins/<plugin-name>/` and be indexed with a `git-subdir` entry pointing at this repository.

If the plugin lives in a subdirectory:

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

For a first-party plugin hosted in this repository:

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

If the plugin lives at the repository root:

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

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the required layout and review checklist.

## References

- [Codex plugin docs](https://developers.openai.com/codex/plugins)
- [Build Codex plugins](https://developers.openai.com/codex/plugins/build)
