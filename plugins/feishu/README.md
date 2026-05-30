# Feishu Agent Plugin

Feishu/Lark plugin for Codex, Claude Code, Cursor, and OpenCode with MCP tools for:

- Docs: create docx documents, read metadata/raw content, list blocks, append text blocks.
- Notifications: send custom bot webhook messages or app bot messages.
- Bitable: list tables, search records, create records, update records.
- Wiki: list spaces, list child nodes, search nodes, get node metadata.

## Install

### Codex

Install `feishu` from the YFGE Codex Plugins marketplace:

```bash
codex plugin marketplace add https://github.com/yfge/codex-plugins.git
```

Then open `/plugins` in Codex and install **Feishu**.

### Claude Code

Add the repository as a Claude Code marketplace, then install **feishu**:

```text
/plugin marketplace add yfge/codex-plugins
```

### Cursor

Use Cursor's plugin marketplace or add-plugin flow with this repository URL:

```text
https://github.com/yfge/codex-plugins.git
```

The Cursor manifest is `plugins/feishu/.cursor-plugin/plugin.json`.

### OpenCode

OpenCode uses local plugin files instead of this repository's marketplace JSON. Follow [`./.opencode/INSTALL.md`](./.opencode/INSTALL.md).

## Configuration

Set one of these credential groups in the environment where the agent runtime runs:

```bash
export FEISHU_APP_ID=cli_xxx
export FEISHU_APP_SECRET=xxx
```

or:

```bash
export FEISHU_TENANT_ACCESS_TOKEN=t-xxx
export FEISHU_USER_ACCESS_TOKEN=u-xxx
```

For custom bot notifications:

```bash
export FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxx
export FEISHU_WEBHOOK_SECRET=xxx
```

Use `FEISHU_USER_ACCESS_TOKEN` when a document or Wiki operation requires user-scoped access. Use `FEISHU_TENANT_ACCESS_TOKEN` or app credentials for app-scoped actions. The same environment variables are used by all supported agent runtimes.

## Required Feishu Permissions

Grant only the scopes your workflows need:

- Docs: create/edit new docs and view new docs.
- Messages: send messages as bot or send/read IM messages.
- Bitable: view/comment/export or edit/manage Bitable.
- Wiki: view Wiki spaces/nodes, create nodes, or edit/manage Wiki.

The Feishu app or bot must also have document, Bitable, or Wiki resource permissions where Feishu enforces resource-level access.

## Development

Run local tests from this plugin directory:

```bash
npm test
```
