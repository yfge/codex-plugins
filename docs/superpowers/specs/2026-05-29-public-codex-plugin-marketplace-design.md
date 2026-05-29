# Public Codex Plugin Marketplace Design

## Goal

Build this repository as a public, open-source, Git-backed Codex plugin marketplace. Users should be able to add the marketplace with a Git URL, then browse and install plugins from Codex with `/plugins`.

## Scope

The first version is a repository marketplace, not a hosted web marketplace. It should be useful immediately through the official Codex marketplace mechanism:

```bash
codex plugin marketplace add https://github.com/yfge/codex-plugins.git
```

After adding the marketplace, users open Codex, run `/plugins`, select this marketplace, and install or enable the plugin they want.

The repository should also be friendly to open-source contributors who want to submit new plugins.

## Repository Structure

The repository root contains the marketplace catalog, plugin bundles, docs, and validation tooling:

```text
.agents/plugins/marketplace.json
plugins/
  example-plugin/
    .codex-plugin/plugin.json
    skills/
      example/
        SKILL.md
README.md
CONTRIBUTING.md
LICENSE
package.json
scripts/
  validate-marketplace.mjs
```

The first plugin can be a minimal example plugin so the marketplace validates end to end and contributors have a concrete template to copy.

## Marketplace Format

`.agents/plugins/marketplace.json` is the public catalog Codex reads. It uses a stable marketplace name and display name, then lists one object per plugin under `plugins`.

Entries should use Git-backed `git-subdir` sources so the marketplace works after users add the public Git repository:

```json
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
```

All plugin source paths must live under `./plugins/<plugin-name>`. The repository should not rely on a plugin living at the repository root because current Codex marketplace validation expects a non-empty local source path.

## Plugin Requirements

Each plugin must include `.codex-plugin/plugin.json` at the plugin root. Public plugins should include enough metadata for users to understand what they are installing:

- `name`
- `version`
- `description`
- `repository`
- `license`
- `keywords`
- `skills`, `mcpServers`, `apps`, or `hooks` when those bundled components exist
- `interface.displayName`
- `interface.shortDescription`
- `interface.longDescription`
- `interface.developerName`
- `interface.category`
- `interface.capabilities`

The `name` in the marketplace entry must match the plugin manifest `name`. Manifest paths must be `./`-prefixed, relative to the plugin root, and stay inside the plugin directory.

## Documentation

`README.md` is user-facing. It should explain:

- what this marketplace is
- how to add it with `codex plugin marketplace add`
- how to browse and install plugins with `/plugins`
- how to update the marketplace with `codex plugin marketplace upgrade`
- how to remove it with `codex plugin marketplace remove`
- the current plugin list

`CONTRIBUTING.md` is author-facing. It should explain:

- plugin directory layout
- manifest metadata requirements
- how to add a marketplace entry
- how to run validation
- review expectations for open-source submissions

## Validation

The repository should include a local validation script that fails fast when the marketplace cannot be safely consumed by Codex. The script should verify:

- `.agents/plugins/marketplace.json` exists and parses as JSON
- top-level marketplace `name`, `interface.displayName`, and `plugins[]` exist
- each plugin entry has `name`, `source`, `policy`, and `category`
- each source is `git-subdir`
- each source `path` starts with `./plugins/`
- each source `url` points at `https://github.com/yfge/codex-plugins.git` unless the repository owner intentionally changes the canonical public URL before release
- each source `ref` exists as a non-empty string
- each referenced plugin directory exists
- each referenced plugin has `.codex-plugin/plugin.json`
- plugin manifest `name` matches the marketplace entry `name`
- plugin manifest has public metadata required by this spec
- any manifest path fields point inside the plugin directory

The script should be runnable with:

```bash
npm run validate
```

## Open-Source Defaults

Use the MIT License unless the project owner chooses another license before publication.

The README should avoid claiming affiliation with OpenAI. It can say the repository follows the public Codex plugin marketplace format and link to the official Codex plugin documentation.

The first implementation should keep the marketplace static and file-based. Search, ratings, hosted submission forms, and a web UI are out of scope until there are enough plugins to justify a separate index.

## Testing

Validation should be the main automated test for v1. Manual verification should cover:

1. Run `npm run validate`.
2. Add the marketplace from a local root with `codex plugin marketplace add ./`.
3. Restart Codex if needed.
4. Open `/plugins`.
5. Confirm the marketplace appears.
6. Confirm the example plugin appears and can be inspected.

## Success Criteria

- A fresh clone contains a valid `.agents/plugins/marketplace.json`.
- At least one example plugin validates.
- Users can add the repository as a Codex marketplace with a Git URL.
- Contributors have enough documentation to submit a plugin without reverse-engineering the format.
- Validation catches broken entries before they are merged.
