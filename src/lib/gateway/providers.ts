/**
 * Provider-specific request builders for the fallback engine.
 * Each builder takes an API key and returns { url, init } for fetch().
 */

import type { providerKeys } from "@/lib/db/schema";

type KeyRecord = typeof providerKeys.$inferSelect;

export function buildOpenAIRequest(apiKey: string, body: unknown): { url: string; init: RequestInit } {
  return {
    url: "https://api.openai.com/v1/chat/completions",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    },
  };
}

export function buildAnthropicRequest(apiKey: string, body: unknown): { url: string; init: RequestInit } {
  return {
    url: "https://api.anthropic.com/v1/messages",
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    },
  };
}

export function buildGoogleRequest(apiKey: string, body: unknown, model = "gemini-1.5-flash"): { url: string; init: RequestInit } {
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  };
}

export function buildCohereRequest(apiKey: string, body: unknown): { url: string; init: RequestInit } {
  return {
    url: "https://api.cohere.ai/v1/chat",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    },
  };
}

export function buildMistralRequest(apiKey: string, body: unknown): { url: string; init: RequestInit } {
  return {
    url: "https://api.mistral.ai/v1/chat/completions",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    },
  };
}

/**
 * Custom provider — fully user-defined endpoint, auth style, and extra headers.
 *
 * Auth styles:
 *   "bearer"  → Authorization: Bearer <key>          (default)
 *   "header"  → <customAuthHeader>: <key>
 *   "query"   → endpoint?<customAuthQuery>=<key>
 *   "none"    → no auth header (key stored but not sent, useful for open endpoints)
 */
export function buildCustomRequest(apiKey: string, body: unknown, key: KeyRecord): { url: string; init: RequestInit } {
  if (!key.customEndpoint) {
    throw new Error(`Custom provider "${key.name}" has no endpoint configured.`);
  }

  const authStyle = key.customAuthStyle ?? "bearer";
  const extraHeaders = (key.customHeaders as Record<string, string> | null) ?? {};

  // Build URL (append query param if authStyle=query)
  let url = key.customEndpoint;
  if (authStyle === "query" && key.customAuthQuery) {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}${key.customAuthQuery}=${encodeURIComponent(apiKey)}`;
  }

  // Build auth headers
  const authHeaders: Record<string, string> = {};
  if (authStyle === "bearer") {
    authHeaders["Authorization"] = `Bearer ${apiKey}`;
  } else if (authStyle === "header" && key.customAuthHeader) {
    authHeaders[key.customAuthHeader] = apiKey;
  }
  // authStyle "none" → no auth header added

  return {
    url,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...extraHeaders,
        ...authHeaders,
      },
      body: JSON.stringify(body),
    },
  };
}
