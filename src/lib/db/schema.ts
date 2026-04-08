import { pgTable, text, timestamp, integer, boolean, jsonb, uuid } from "drizzle-orm/pg-core";

export const gatewayKeys = pgTable("gateway_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(), // e.g. "ntw_" first 8 chars for display
  isActive: boolean("is_active").notNull().default(true),
  totalRequests: integer("total_requests").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

export const providerKeys = pgTable("provider_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Built-in: openai | anthropic | google | cohere | mistral
  // Custom:   "custom" — uses customEndpoint + customHeaders + authStyle
  provider: text("provider").notNull(),
  name: text("name").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  keyPreview: text("key_preview").notNull(), // last 4 chars
  priority: integer("priority").notNull().default(1), // 1 = primary, 2+ = fallback
  isActive: boolean("is_active").notNull().default(true),
  errorCount: integer("error_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  lastErrorAt: timestamp("last_error_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Custom provider fields (null for built-in providers)
  customEndpoint: text("custom_endpoint"),       // e.g. https://my-llm.com/v1/chat
  customAuthStyle: text("custom_auth_style"),    // "bearer" | "header" | "query" | "none"
  customAuthHeader: text("custom_auth_header"),  // header name if authStyle="header", e.g. "X-API-Key"
  customAuthQuery: text("custom_auth_query"),    // query param name if authStyle="query", e.g. "api_key"
  customHeaders: jsonb("custom_headers"),        // extra static headers as JSON object
});

export const requestLogs = pgTable("request_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  gatewayKeyId: uuid("gateway_key_id").references(() => gatewayKeys.id),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  providerKeyId: uuid("provider_key_id").references(() => providerKeys.id),
  status: integer("status").notNull(),
  promptTokens: integer("prompt_tokens").default(0),
  completionTokens: integer("completion_tokens").default(0),
  latencyMs: integer("latency_ms"),
  error: text("error"),
  fallbackUsed: boolean("fallback_used").notNull().default(false),
  fallbackAttempts: integer("fallback_attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
