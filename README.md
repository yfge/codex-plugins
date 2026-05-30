# YFGE Agent Plugins

Public Git-backed index marketplace for open-source agent plugins.

Codex remains the primary catalog format. The same plugin set is also indexed for Claude Code and Cursor, with OpenCode support provided through local/Git installable plugin wrappers and install notes.

This repository is not affiliated with OpenAI, Anthropic, Cursor, or OpenCode.

## Install

### Codex

Add this marketplace to Codex:

```bash
codex plugin marketplace add https://github.com/yfge/codex-plugins.git
```

Maintainers can use the SSH remote for pushing changes:

```bash
git@github.com:yfge/codex-plugins.git
```

### Claude Code

The Claude Code marketplace index lives at `.claude-plugin/marketplace.json`.

Add this repository as a Claude Code plugin marketplace:

```text
/plugin marketplace add yfge/codex-plugins
```

### Cursor

The Cursor marketplace index lives at `.cursor-plugin/marketplace.json`.

Add this repository URL in Cursor's plugin marketplace or add-plugin flow:

```text
https://github.com/yfge/codex-plugins.git
```

### OpenCode

OpenCode does not consume the marketplace JSON files directly. Clone this repository and install the plugin wrapper from the plugin's `.opencode/` directory.

For Feishu, see [`plugins/feishu/.opencode/INSTALL.md`](./plugins/feishu/.opencode/INSTALL.md).

## Browse Plugins

Open Codex in a project, then type:

```text
/plugins
```

Choose **YFGE Codex Plugins** from the marketplace tabs, inspect a plugin, then install or enable it from the Codex plugin browser.

## Codex Maintenance

Refresh the marketplace snapshot:

```bash
codex plugin marketplace upgrade yfge-codex-plugins
```

Remove the marketplace from Codex:

```bash
codex plugin marketplace remove yfge-codex-plugins
```

## Runtime Indexes

| Runtime | Index or install mechanism |
| --- | --- |
| Codex | `.agents/plugins/marketplace.json` |
| Claude Code | `.claude-plugin/marketplace.json` |
| Cursor | `.cursor-plugin/marketplace.json` |
| OpenCode | Per-plugin `.opencode/plugins/*.js` wrapper and install docs |

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

The validator checks the Codex, Claude Code, and Cursor marketplace catalogs, plugin id consistency, external Git source descriptors, first-party runtime manifests, OpenCode wrappers, source paths, install policies, and duplicate plugin ids.

## Add A Plugin

Prefer keeping plugin source code in its own public GitHub repository and adding only index entries to the runtime marketplace files. First-party plugins maintained with this marketplace may also live under `plugins/<plugin-name>/` and be indexed with a local source in Claude Code/Cursor plus a `git-subdir` Codex entry pointing at this repository.

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

Mirror the same plugin id in `.claude-plugin/marketplace.json` and `.cursor-plugin/marketplace.json`. For external repositories, keep Codex and Claude Code sources pinned with a branch/tag `ref` or commit `sha`; Cursor's current marketplace schema uses a string Git URL source. For first-party plugins, add:

```text
plugins/<plugin-name>/
  .codex-plugin/plugin.json
  .claude-plugin/plugin.json
  .cursor-plugin/plugin.json
  .opencode/plugins/<plugin-name>.js
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the required layout and review checklist.

## References

- [Codex plugin docs](https://developers.openai.com/codex/plugins)
- [Build Codex plugins](https://developers.openai.com/codex/plugins/build)
- [Claude Code plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [OpenCode plugins](https://open-code.ai/en/docs/plugins)
