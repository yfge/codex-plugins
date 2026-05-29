# Public Codex Plugin Marketplace Design

## Goal

Build this repository as a public, open-source, Git-backed Codex plugin marketplace index. Users should be able to add the marketplace with a Git URL, then browse and install plugins from Codex with `/plugins`.

## Scope

The first version is a repository marketplace, not a hosted web marketplace. It should be useful immediately through the official Codex marketplace mechanism:

```bash
codex plugin marketplace add https://github.com/yfge/codex-plugins.git
```

After adding the marketplace, users open Codex, run `/plugins`, select this marketplace, and install or enable the plugin they want.

The repository should also be friendly to open-source contributors who want to submit new plugins.

## Repository Structure

The repository root contains the marketplace catalog, docs, and validation tooling:

```text
.agents/plugins/marketplace.json
README.md
CONTRIBUTING.md
LICENSE
package.json
scripts/
  validate-marketplace.mjs
```

Plugin source code lives in external public GitHub repositories. This repository stores the index entries only.

## Marketplace Format

`.agents/plugins/marketplace.json` is the public catalog Codex reads. It uses a stable marketplace name and display name, then lists one object per plugin under `plugins`.

Entries can use Git-backed `git-subdir` sources when the plugin lives in a subdirectory:

```json
{
  "name": "example-plugin",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/example/example-plugin.git",
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

Entries can use `url` sources when the plugin lives at the external repository root:

```json
{
  "name": "example-plugin",
  "source": {
    "source": "url",
    "url": "https://github.com/example/example-plugin.git",
    "ref": "main"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Productivity"
}
```

For `git-subdir`, `source.path` must be a `./`-prefixed path that stays inside the referenced external repository. For `url`, omit `source.path`.

## Plugin Requirements

Each external plugin must include `.codex-plugin/plugin.json` at the plugin root. Public plugins should include enough metadata for users to understand what they are installing:

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

The `name` in the marketplace entry must match the external plugin manifest `name`. Manifest paths must be `./`-prefixed, relative to the plugin root, and stay inside the plugin directory.

## Documentation

`README.md` is user-facing. It should explain:

- what this marketplace is
- how to add it with `codex plugin marketplace add`
- how to browse and install plugins with `/plugins`
- how to update the marketplace with `codex plugin marketplace upgrade`
- how to remove it with `codex plugin marketplace remove`
- the current indexed plugin list

`CONTRIBUTING.md` is author-facing. It should explain:

- external plugin repository layout
- manifest metadata requirements
- how to add an external marketplace entry
- how to run validation
- review expectations for open-source submissions

## Validation

The repository should include a local validation script that fails fast when the marketplace cannot be safely consumed by Codex. The script should verify:

- `.agents/plugins/marketplace.json` exists and parses as JSON
- top-level marketplace `name`, `interface.displayName`, and `plugins[]` exist
- each plugin entry has `name`, `source`, `policy`, and `category`
- each source is `git-subdir` or `url`
- each source `url` is a GitHub HTTPS or SSH URL
- each source has `ref` or `sha`
- `git-subdir` entries have a safe `./`-prefixed source `path`
- `url` entries omit source `path`
- duplicate plugin ids are rejected

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
6. Confirm the marketplace appears even when no plugins are indexed yet.

## Success Criteria

- A fresh clone contains a valid `.agents/plugins/marketplace.json`.
- Empty index startup validates.
- Users can add the repository as a Codex marketplace with a Git URL.
- Contributors have enough documentation to submit an external plugin repository entry without reverse-engineering the format.
- Validation catches broken entries before they are merged.
