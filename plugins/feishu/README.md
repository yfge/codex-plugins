# Feishu Codex Plugin

Feishu plugin for Codex with MCP tools for:

- Docs: create docx documents, read metadata/raw content, list blocks, append text blocks.
- Notifications: send custom bot webhook messages or app bot messages.
- Bitable: list tables, search records, create records, update records.
- Wiki: list spaces, list child nodes, search nodes, get node metadata.

## Configuration

Set one of these credential groups in the environment where Codex runs:

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

Use `FEISHU_USER_ACCESS_TOKEN` when a document or Wiki operation requires user-scoped access. Use `FEISHU_TENANT_ACCESS_TOKEN` or app credentials for app-scoped actions.

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
