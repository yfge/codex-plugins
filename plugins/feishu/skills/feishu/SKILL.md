---
name: feishu
description: Use when the user asks Codex to work with Feishu or Lark docs, notifications, Bitable records, or Wiki knowledge bases.
---

# Feishu

Use the Feishu MCP server when a task needs live Feishu or Lark workspace access.

## Configuration

The MCP server reads credentials from environment variables:

- `FEISHU_APP_ID` and `FEISHU_APP_SECRET` for tenant access token acquisition.
- `FEISHU_TENANT_ACCESS_TOKEN` to provide a tenant token directly.
- `FEISHU_USER_ACCESS_TOKEN` for user-scoped document or wiki actions.
- `FEISHU_WEBHOOK_URL` and optional `FEISHU_WEBHOOK_SECRET` for custom bot notifications.
- `FEISHU_BASE_URL` only when using a non-default Feishu-compatible OpenAPI base URL.

Start by calling `feishu_auth_status` if the user asks whether configuration is ready or if an API call fails with authentication errors.

## Tool Selection

- Documents: use `feishu_docs_create`, `feishu_docs_get`, `feishu_docs_list_blocks`, and `feishu_docs_append_text`.
- Notifications: use `feishu_send_webhook` for custom bot webhooks, or `feishu_send_message` for app bot messages to a user or chat.
- Bitable: use `feishu_bitable_list_tables`, `feishu_bitable_search_records`, `feishu_bitable_create_record`, and `feishu_bitable_update_record`.
- Wiki: use `feishu_wiki_list_spaces`, `feishu_wiki_list_nodes`, `feishu_wiki_search`, and `feishu_wiki_get_node`.
- Advanced operations: use `feishu_api_request` with an official Feishu OpenAPI path.

## Safety

- Never print app secrets, webhook secrets, or access tokens.
- For writes or outbound notifications, summarize the exact destination and payload before calling tools when the destination is not obvious from the user's request.
- If Feishu returns a permission error, report the missing action and ask the user to grant the corresponding Feishu app scope or document/wiki permission.
