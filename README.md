# YFGE Codex Plugins

Public Git-backed marketplace for OpenAI Codex plugins.

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
| `example-plugin` | Productivity | Minimal sample plugin for marketplace authors. |

## Validate

Run the repository checks before submitting changes:

```bash
npm test
npm run validate
```

The validator checks the marketplace catalog, plugin source paths, plugin manifests, required public metadata, and manifest path boundaries.

## Add A Plugin

Create a new directory under `plugins/<plugin-name>/`, add `.codex-plugin/plugin.json`, bundle any skills or integrations, then add a matching entry to `.agents/plugins/marketplace.json`.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the required layout and review checklist.

## References

- [Codex plugin docs](https://developers.openai.com/codex/plugins)
- [Build Codex plugins](https://developers.openai.com/codex/plugins/build)
