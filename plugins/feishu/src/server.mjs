#!/usr/bin/env node
import crypto from "node:crypto";

const DEFAULT_BASE_URL = "https://open.feishu.cn";
const SERVER_VERSION = "0.1.0";
const tokenCache = new Map();

function env(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function baseUrl() {
  return env("FEISHU_BASE_URL") ?? DEFAULT_BASE_URL;
}

function requireString(args, key) {
  const value = args?.[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}

function normalizePath(path) {
  if (typeof path !== "string" || path.trim() === "") {
    throw new Error("path is required");
  }
  if (/^https?:\/\//i.test(path)) {
    throw new Error("path must be an OpenAPI path, not a full URL");
  }

  let normalized = path.trim();
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  if (!normalized.startsWith("/open-apis/")) {
    normalized = `/open-apis${normalized}`;
  }
  return normalized;
}

function buildUrl(path, query = {}) {
  const url = new URL(normalizePath(path), baseUrl());
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function encodePath(value) {
  return encodeURIComponent(String(value));
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function responseMeta(response) {
  return {
    status: response.status,
    statusText: response.statusText,
    logId: response.headers.get("x-tt-logid") ?? undefined,
    requestId: response.headers.get("x-request-id") ?? undefined,
    retryAfter: response.headers.get("retry-after") ?? undefined
  };
}

function assertFeishuSuccess(parsed, meta) {
  if (parsed && typeof parsed === "object" && typeof parsed.code === "number" && parsed.code !== 0) {
    const logHint = meta.logId ? ` x-tt-logid=${meta.logId}` : "";
    throw new Error(`Feishu API error ${parsed.code}: ${parsed.msg ?? "unknown"}${logHint}`);
  }
}

async function fetchTenantAccessToken() {
  const cached = tokenCache.get("tenant");
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const appId = env("FEISHU_APP_ID");
  const appSecret = env("FEISHU_APP_SECRET");
  if (!appId || !appSecret) {
    throw new Error("Set FEISHU_APP_ID and FEISHU_APP_SECRET, or provide FEISHU_TENANT_ACCESS_TOKEN");
  }

  const response = await fetch(buildUrl("/auth/v3/tenant_access_token/internal"), {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret })
  });
  const parsed = await parseResponse(response);
  const meta = responseMeta(response);
  if (!response.ok) {
    throw new Error(`Feishu auth HTTP ${response.status}: ${JSON.stringify(parsed)}`);
  }
  assertFeishuSuccess(parsed, meta);
  if (!parsed?.tenant_access_token) {
    throw new Error("Feishu auth response did not include tenant_access_token");
  }

  tokenCache.set("tenant", {
    token: parsed.tenant_access_token,
    expiresAt: Date.now() + Number(parsed.expire ?? 7200) * 1000
  });
  return parsed.tenant_access_token;
}

async function getAccessToken(tokenType = "tenant") {
  if (tokenType === "none") {
    return undefined;
  }
  if (tokenType === "user") {
    const token = env("FEISHU_USER_ACCESS_TOKEN");
    if (!token) {
      throw new Error("Set FEISHU_USER_ACCESS_TOKEN to use token_type=user");
    }
    return token;
  }

  const provided = env("FEISHU_TENANT_ACCESS_TOKEN");
  if (provided) {
    return provided;
  }
  return fetchTenantAccessToken();
}

async function feishuRequest({ method = "GET", path, query, body, token_type = "tenant", throw_on_error = true }) {
  const token = await getAccessToken(token_type);
  const headers = { "content-type": "application/json; charset=utf-8" };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method: method.toUpperCase(),
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const parsed = await parseResponse(response);
  const meta = responseMeta(response);

  if (throw_on_error && !response.ok) {
    throw new Error(`Feishu HTTP ${response.status}: ${JSON.stringify(parsed)}${meta.logId ? ` x-tt-logid=${meta.logId}` : ""}`);
  }
  if (throw_on_error) {
    assertFeishuSuccess(parsed, meta);
  }

  return { meta, body: parsed };
}

function webhookSign(secret, timestamp) {
  const stringToSign = `${timestamp}\n${secret}`;
  return crypto.createHmac("sha256", Buffer.from(stringToSign, "utf8")).update("").digest("base64");
}

function textBlock(text, blockType = 2, textElementStyle = {}) {
  const blockKeys = new Map([
    [2, "text"],
    [3, "heading1"],
    [4, "heading2"],
    [5, "heading3"],
    [6, "heading4"],
    [7, "heading5"],
    [8, "heading6"],
    [9, "heading7"],
    [10, "heading8"],
    [11, "heading9"],
    [12, "bullet"],
    [13, "ordered"],
    [14, "code"]
  ]);
  const key = blockKeys.get(Number(blockType));
  if (!key) {
    throw new Error("block_type must be one of 2..14 for text-like blocks");
  }

  return {
    block_type: Number(blockType),
    [key]: {
      elements: [
        {
          text_run: {
            content: text,
            text_element_style: textElementStyle
          }
        }
      ]
    }
  };
}

const tools = [
  {
    name: "feishu_auth_status",
    description: "Check Feishu plugin configuration. Optionally verifies tenant token acquisition against Feishu.",
    inputSchema: {
      type: "object",
      properties: {
        check_remote: { type: "boolean", description: "When true, fetch or validate a tenant access token." }
      }
    }
  },
  {
    name: "feishu_api_request",
    description: "Call any Feishu OpenAPI path for advanced operations not covered by a specific tool.",
    inputSchema: {
      type: "object",
      required: ["path"],
      properties: {
        method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], default: "GET" },
        path: { type: "string", description: "OpenAPI path, for example /bitable/v1/apps/:app_token/tables." },
        query: { type: "object", additionalProperties: true },
        body: { type: "object", additionalProperties: true },
        token_type: { type: "string", enum: ["tenant", "user", "none"], default: "tenant" },
        throw_on_error: { type: "boolean", default: false }
      }
    }
  },
  {
    name: "feishu_send_webhook",
    description: "Send a notification through a Feishu custom bot webhook. Supports text and interactive card payloads.",
    inputSchema: {
      type: "object",
      properties: {
        webhook_url: { type: "string", description: "Defaults to FEISHU_WEBHOOK_URL." },
        webhook_secret: { type: "string", description: "Defaults to FEISHU_WEBHOOK_SECRET." },
        text: { type: "string" },
        card: { type: "object", additionalProperties: true },
        msg_type: { type: "string", enum: ["text", "interactive"], default: "text" }
      }
    }
  },
  {
    name: "feishu_send_message",
    description: "Send a Feishu bot message to a user or chat using the IM v1 messages API.",
    inputSchema: {
      type: "object",
      required: ["receive_id", "receive_id_type"],
      properties: {
        receive_id_type: { type: "string", enum: ["open_id", "union_id", "user_id", "email", "chat_id"] },
        receive_id: { type: "string" },
        msg_type: { type: "string", default: "text" },
        text: { type: "string", description: "Convenience field for text messages." },
        content: { description: "Message content object or pre-stringified JSON content." },
        token_type: { type: "string", enum: ["tenant", "user"], default: "tenant" }
      }
    }
  },
  {
    name: "feishu_docs_create",
    description: "Create a Feishu docx document with an optional title and folder token.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        folder_token: { type: "string" },
        token_type: { type: "string", enum: ["tenant", "user"], default: "tenant" }
      }
    }
  },
  {
    name: "feishu_docs_get",
    description: "Get Feishu docx metadata and optionally raw text content.",
    inputSchema: {
      type: "object",
      required: ["document_id"],
      properties: {
        document_id: { type: "string" },
        include_raw_content: { type: "boolean", default: false },
        token_type: { type: "string", enum: ["tenant", "user"], default: "tenant" }
      }
    }
  },
  {
    name: "feishu_docs_list_blocks",
    description: "List blocks in a Feishu docx document.",
    inputSchema: {
      type: "object",
      required: ["document_id"],
      properties: {
        document_id: { type: "string" },
        page_size: { type: "integer", minimum: 1, maximum: 500 },
        page_token: { type: "string" },
        document_revision_id: { type: "integer" },
        token_type: { type: "string", enum: ["tenant", "user"], default: "tenant" }
      }
    }
  },
  {
    name: "feishu_docs_append_text",
    description: "Append a text-like block to a Feishu docx document. Defaults to the document root block.",
    inputSchema: {
      type: "object",
      required: ["document_id", "text"],
      properties: {
        document_id: { type: "string" },
        parent_block_id: { type: "string" },
        text: { type: "string" },
        block_type: { type: "integer", default: 2, description: "2 text, 3 heading1, 4 heading2, 12 bullet, 13 ordered, 14 code." },
        index: { type: "integer" },
        document_revision_id: { type: "integer" },
        text_element_style: { type: "object", additionalProperties: true },
        token_type: { type: "string", enum: ["tenant", "user"], default: "tenant" }
      }
    }
  },
  {
    name: "feishu_bitable_list_tables",
    description: "List tables in a Feishu Bitable app.",
    inputSchema: {
      type: "object",
      required: ["app_token"],
      properties: {
        app_token: { type: "string" },
        page_size: { type: "integer", minimum: 1, maximum: 100 },
        page_token: { type: "string" },
        token_type: { type: "string", enum: ["tenant", "user"], default: "tenant" }
      }
    }
  },
  {
    name: "feishu_bitable_search_records",
    description: "Search records in a Feishu Bitable table.",
    inputSchema: {
      type: "object",
      required: ["app_token", "table_id"],
      properties: {
        app_token: { type: "string" },
        table_id: { type: "string" },
        page_size: { type: "integer", minimum: 1, maximum: 500 },
        page_token: { type: "string" },
        view_id: { type: "string" },
        field_names: { type: "array", items: { type: "string" } },
        filter: { type: "object", additionalProperties: true },
        sort: { type: "array", items: { type: "object", additionalProperties: true } },
        automatic_fields: { type: "boolean" },
        user_id_type: { type: "string" },
        token_type: { type: "string", enum: ["tenant", "user"], default: "tenant" }
      }
    }
  },
  {
    name: "feishu_bitable_create_record",
    description: "Create one record in a Feishu Bitable table.",
    inputSchema: {
      type: "object",
      required: ["app_token", "table_id", "fields"],
      properties: {
        app_token: { type: "string" },
        table_id: { type: "string" },
        fields: { type: "object", additionalProperties: true },
        user_id_type: { type: "string" },
        token_type: { type: "string", enum: ["tenant", "user"], default: "tenant" }
      }
    }
  },
  {
    name: "feishu_bitable_update_record",
    description: "Update one record in a Feishu Bitable table.",
    inputSchema: {
      type: "object",
      required: ["app_token", "table_id", "record_id", "fields"],
      properties: {
        app_token: { type: "string" },
        table_id: { type: "string" },
        record_id: { type: "string" },
        fields: { type: "object", additionalProperties: true },
        user_id_type: { type: "string" },
        token_type: { type: "string", enum: ["tenant", "user"], default: "tenant" }
      }
    }
  },
  {
    name: "feishu_wiki_list_spaces",
    description: "List Feishu Wiki spaces visible to the token.",
    inputSchema: {
      type: "object",
      properties: {
        page_size: { type: "integer", minimum: 1, maximum: 50 },
        page_token: { type: "string" },
        token_type: { type: "string", enum: ["tenant", "user"], default: "tenant" }
      }
    }
  },
  {
    name: "feishu_wiki_list_nodes",
    description: "List child nodes in a Feishu Wiki space.",
    inputSchema: {
      type: "object",
      required: ["space_id"],
      properties: {
        space_id: { type: "string" },
        parent_node_token: { type: "string" },
        page_size: { type: "integer", minimum: 1, maximum: 50 },
        page_token: { type: "string" },
        token_type: { type: "string", enum: ["tenant", "user"], default: "tenant" }
      }
    }
  },
  {
    name: "feishu_wiki_search",
    description: "Search Feishu Wiki nodes by query.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" },
        space_id: { type: "string" },
        node_id: { type: "string" },
        obj_type: { type: "string" },
        page_size: { type: "integer", minimum: 1, maximum: 50 },
        page_token: { type: "string" },
        token_type: { type: "string", enum: ["tenant", "user"], default: "tenant" }
      }
    }
  },
  {
    name: "feishu_wiki_get_node",
    description: "Get Feishu Wiki node metadata by wiki token or underlying document token.",
    inputSchema: {
      type: "object",
      required: ["token"],
      properties: {
        token: { type: "string" },
        obj_type: { type: "string", description: "Defaults to wiki. Use docx, doc, sheet, bitable, etc. for source document tokens." },
        token_type: { type: "string", enum: ["tenant", "user"], default: "tenant" }
      }
    }
  }
];

const handlers = {
  async feishu_auth_status(args = {}) {
    const configured = {
      base_url: baseUrl(),
      app_id: Boolean(env("FEISHU_APP_ID")),
      app_secret: Boolean(env("FEISHU_APP_SECRET")),
      tenant_access_token: Boolean(env("FEISHU_TENANT_ACCESS_TOKEN")),
      user_access_token: Boolean(env("FEISHU_USER_ACCESS_TOKEN")),
      webhook_url: Boolean(env("FEISHU_WEBHOOK_URL")),
      webhook_secret: Boolean(env("FEISHU_WEBHOOK_SECRET"))
    };
    const result = { configured };
    if (args.check_remote) {
      const token = await getAccessToken("tenant");
      result.remote = {
        tenant_token_available: Boolean(token),
        source: env("FEISHU_TENANT_ACCESS_TOKEN") ? "FEISHU_TENANT_ACCESS_TOKEN" : "FEISHU_APP_ID/FEISHU_APP_SECRET"
      };
    }
    return result;
  },

  async feishu_api_request(args = {}) {
    return feishuRequest({
      method: args.method ?? "GET",
      path: requireString(args, "path"),
      query: args.query,
      body: args.body,
      token_type: args.token_type ?? "tenant",
      throw_on_error: Boolean(args.throw_on_error)
    });
  },

  async feishu_send_webhook(args = {}) {
    const webhookUrl = args.webhook_url ?? env("FEISHU_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("webhook_url is required or set FEISHU_WEBHOOK_URL");
    }
    const msgType = args.msg_type ?? (args.card ? "interactive" : "text");
    const payload = msgType === "interactive"
      ? { msg_type: "interactive", card: args.card }
      : { msg_type: "text", content: { text: requireString(args, "text") } };

    const secret = args.webhook_secret ?? env("FEISHU_WEBHOOK_SECRET");
    if (secret) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      payload.timestamp = timestamp;
      payload.sign = webhookSign(secret, timestamp);
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload)
    });
    const parsed = await parseResponse(response);
    const meta = responseMeta(response);
    if (!response.ok) {
      throw new Error(`Feishu webhook HTTP ${response.status}: ${JSON.stringify(parsed)}`);
    }
    assertFeishuSuccess(parsed, meta);
    return { meta, body: parsed };
  },

  async feishu_send_message(args = {}) {
    const msgType = args.msg_type ?? "text";
    let content = args.content;
    if (content === undefined && args.text !== undefined) {
      content = { text: args.text };
    }
    if (content === undefined) {
      throw new Error("content or text is required");
    }
    return feishuRequest({
      method: "POST",
      path: "/im/v1/messages",
      query: { receive_id_type: requireString(args, "receive_id_type") },
      body: {
        receive_id: requireString(args, "receive_id"),
        msg_type: msgType,
        content: typeof content === "string" ? content : JSON.stringify(content)
      },
      token_type: args.token_type ?? "tenant"
    });
  },

  async feishu_docs_create(args = {}) {
    const body = {};
    if (args.title !== undefined) body.title = args.title;
    if (args.folder_token !== undefined) body.folder_token = args.folder_token;
    return feishuRequest({
      method: "POST",
      path: "/docx/v1/documents",
      body,
      token_type: args.token_type ?? "tenant"
    });
  },

  async feishu_docs_get(args = {}) {
    const documentId = encodePath(requireString(args, "document_id"));
    const metadata = await feishuRequest({
      path: `/docx/v1/documents/${documentId}`,
      token_type: args.token_type ?? "tenant"
    });
    if (!args.include_raw_content) {
      return metadata;
    }
    const raw = await feishuRequest({
      path: `/docx/v1/documents/${documentId}/raw_content`,
      token_type: args.token_type ?? "tenant"
    });
    return { metadata, raw_content: raw };
  },

  async feishu_docs_list_blocks(args = {}) {
    return feishuRequest({
      path: `/docx/v1/documents/${encodePath(requireString(args, "document_id"))}/blocks`,
      query: {
        page_size: args.page_size,
        page_token: args.page_token,
        document_revision_id: args.document_revision_id
      },
      token_type: args.token_type ?? "tenant"
    });
  },

  async feishu_docs_append_text(args = {}) {
    const documentId = requireString(args, "document_id");
    const parentBlockId = args.parent_block_id ?? documentId;
    const query = {};
    if (args.document_revision_id !== undefined) query.document_revision_id = args.document_revision_id;
    const body = {
      children: [
        textBlock(requireString(args, "text"), args.block_type ?? 2, args.text_element_style ?? {})
      ]
    };
    if (args.index !== undefined) body.index = args.index;
    return feishuRequest({
      method: "POST",
      path: `/docx/v1/documents/${encodePath(documentId)}/blocks/${encodePath(parentBlockId)}/children`,
      query,
      body,
      token_type: args.token_type ?? "tenant"
    });
  },

  async feishu_bitable_list_tables(args = {}) {
    return feishuRequest({
      path: `/bitable/v1/apps/${encodePath(requireString(args, "app_token"))}/tables`,
      query: { page_size: args.page_size, page_token: args.page_token },
      token_type: args.token_type ?? "tenant"
    });
  },

  async feishu_bitable_search_records(args = {}) {
    const body = {};
    for (const key of ["view_id", "field_names", "filter", "sort", "automatic_fields"]) {
      if (args[key] !== undefined) body[key] = args[key];
    }
    return feishuRequest({
      method: "POST",
      path: `/bitable/v1/apps/${encodePath(requireString(args, "app_token"))}/tables/${encodePath(requireString(args, "table_id"))}/records/search`,
      query: { page_size: args.page_size, page_token: args.page_token, user_id_type: args.user_id_type },
      body,
      token_type: args.token_type ?? "tenant"
    });
  },

  async feishu_bitable_create_record(args = {}) {
    return feishuRequest({
      method: "POST",
      path: `/bitable/v1/apps/${encodePath(requireString(args, "app_token"))}/tables/${encodePath(requireString(args, "table_id"))}/records`,
      query: { user_id_type: args.user_id_type },
      body: { fields: args.fields },
      token_type: args.token_type ?? "tenant"
    });
  },

  async feishu_bitable_update_record(args = {}) {
    return feishuRequest({
      method: "PUT",
      path: `/bitable/v1/apps/${encodePath(requireString(args, "app_token"))}/tables/${encodePath(requireString(args, "table_id"))}/records/${encodePath(requireString(args, "record_id"))}`,
      query: { user_id_type: args.user_id_type },
      body: { fields: args.fields },
      token_type: args.token_type ?? "tenant"
    });
  },

  async feishu_wiki_list_spaces(args = {}) {
    return feishuRequest({
      path: "/wiki/v2/spaces",
      query: { page_size: args.page_size, page_token: args.page_token },
      token_type: args.token_type ?? "tenant"
    });
  },

  async feishu_wiki_list_nodes(args = {}) {
    return feishuRequest({
      path: `/wiki/v2/spaces/${encodePath(requireString(args, "space_id"))}/nodes`,
      query: {
        parent_node_token: args.parent_node_token,
        page_size: args.page_size,
        page_token: args.page_token
      },
      token_type: args.token_type ?? "tenant"
    });
  },

  async feishu_wiki_search(args = {}) {
    const body = { query: requireString(args, "query") };
    for (const key of ["space_id", "node_id", "obj_type"]) {
      if (args[key] !== undefined) body[key] = args[key];
    }
    return feishuRequest({
      method: "POST",
      path: "/wiki/v2/nodes/search",
      query: { page_size: args.page_size, page_token: args.page_token },
      body,
      token_type: args.token_type ?? "tenant"
    });
  },

  async feishu_wiki_get_node(args = {}) {
    return feishuRequest({
      path: "/wiki/v2/spaces/get_node",
      query: { token: requireString(args, "token"), obj_type: args.obj_type },
      token_type: args.token_type ?? "tenant"
    });
  }
};

function toolResult(value, isError = false) {
  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2)
      }
    ],
    isError
  };
}

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function respond(id, result) {
  if (id === undefined) return;
  write({ jsonrpc: "2.0", id, result });
}

function respondError(id, code, message, data) {
  if (id === undefined) return;
  write({ jsonrpc: "2.0", id, error: { code, message, data } });
}

async function handle(message) {
  if (!message || typeof message !== "object") {
    return;
  }
  const { id, method, params } = message;

  try {
    if (method === "initialize") {
      respond(id, {
        protocolVersion: params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "feishu", version: SERVER_VERSION }
      });
      return;
    }
    if (method === "notifications/initialized") {
      return;
    }
    if (method === "ping") {
      respond(id, {});
      return;
    }
    if (method === "tools/list") {
      respond(id, { tools });
      return;
    }
    if (method === "tools/call") {
      const name = params?.name;
      const handler = handlers[name];
      if (!handler) {
        respond(id, toolResult(`Unknown tool: ${name}`, true));
        return;
      }
      try {
        const result = await handler(params?.arguments ?? {});
        respond(id, toolResult(result));
      } catch (error) {
        respond(id, toolResult(error.message, true));
      }
      return;
    }
    if (method === "resources/list" || method === "prompts/list") {
      respond(id, method === "resources/list" ? { resources: [] } : { prompts: [] });
      return;
    }
    if (method === "shutdown") {
      respond(id, {});
      return;
    }
    respondError(id, -32601, `Method not found: ${method}`);
  } catch (error) {
    respondError(id, -32603, error.message);
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  buffer += chunk;
  while (true) {
    const index = buffer.indexOf("\n");
    if (index === -1) break;
    const line = buffer.slice(0, index).replace(/\r$/, "");
    buffer = buffer.slice(index + 1);
    if (!line.trim()) continue;
    try {
      void handle(JSON.parse(line));
    } catch (error) {
      respondError(undefined, -32700, error.message);
    }
  }
});
