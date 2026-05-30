# Feishu OpenCode Install

OpenCode does not use a marketplace JSON file. Install this plugin from a local clone and point OpenCode at the plugin file.

```bash
git clone https://github.com/yfge/codex-plugins.git ~/.config/opencode/yfge-codex-plugins
mkdir -p ~/.config/opencode/plugins
ln -sf ~/.config/opencode/yfge-codex-plugins/plugins/feishu/.opencode/plugins/feishu.js ~/.config/opencode/plugins/feishu.js
```

The wrapper registers the Feishu skill directory and MCP server for loaders that support plugin config hooks.

If your OpenCode build only discovers skills from standard skill directories, link the skill explicitly:

```bash
mkdir -p ~/.config/opencode/skills
ln -sfn ~/.config/opencode/yfge-codex-plugins/plugins/feishu/skills/feishu ~/.config/opencode/skills/feishu
```

If MCP config is not applied by your OpenCode build, merge this into `~/.config/opencode/opencode.json` and replace the absolute path if you cloned elsewhere:

```json
{
  "mcp": {
    "feishu": {
      "type": "local",
      "command": [
        "node",
        "/Users/you/.config/opencode/yfge-codex-plugins/plugins/feishu/src/server.mjs"
      ],
      "enabled": true
    }
  }
}
```
