---
name: example
description: Demonstrate that the example plugin is installed and available.
---

When invoked, briefly confirm that the Example Plugin skill is available. Then show a compact checklist for adding a real plugin to this marketplace:

1. Create `plugins/<plugin-name>/.codex-plugin/plugin.json`.
2. Add bundled skills, apps, MCP servers, or hooks at the plugin root.
3. Add a matching entry to `.agents/plugins/marketplace.json`.
4. Run `npm run validate`.
