import { NextRequest, NextResponse } from "next/server";
import { validateGatewayKey } from "@/lib/auth";
import { db, providerKeys } from "@/lib/db";
import { decrypt } from "@/lib/gateway/crypto";
import { eq } from "drizzle-orm";
import { ensureTables } from "@/lib/db/migrate";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-Api-Key, Content-Type",
};

const STATIC_MODELS: Record<string, string[]> = {
  openai:    ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo", "o1", "o1-mini", "o3-mini"],
  anthropic: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
  google:    ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
  cohere:    ["command-r-plus", "command-r", "command", "command-light"],
  mistral:   ["mistral-large-latest", "mistral-small-latest", "mixtral-8x7b-instruct-v0.1"],
};

function makeModel(id: string, ownedBy: string) {
  return { id, object: "model", created: 1700000000, owned_by: ownedBy };
}

async function tryFetchModels(apiKey: string, key: typeof providerKeys.$inferSelect): Promise<string[]> {
  try {
    const endpoint = (key.customEndpoint ?? "")
      .replace(/\/chat\/completions\/?$/, "")
      .replace(/\/completions\/?$/, "")
      .replace(/\/messages\/?$/, "")
      .replace(/\/$/, "");

    const url = `${endpoint}/models`;
    const headers: Record<string, string> = {};
    if (!key.customAuthStyle || key.customAuthStyle === "bearer") {
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else if (key.customAuthStyle === "header" && key.customAuthHeader) {
      headers[key.customAuthHeader] = apiKey;
    }

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? data.models ?? data.result ?? [])
      .map((m: { id?: string; name?: string; model?: string }) => m.id ?? m.name ?? m.model ?? "")
      .filter(Boolean);
  } catch { return []; }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  await ensureTables();

  const auth = await validateGatewayKey(req);
  if (!auth.valid) {
    return NextResponse.json(
      { error: { message: auth.error, type: "auth_error" } },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const keys = await db.select().from(providerKeys).where(eq(providerKeys.isActive, true));

  // Pick primary key per provider
  const primaryByProvider = keys.reduce((acc, k) => {
    if (!acc[k.provider] || k.priority < acc[k.provider].priority) acc[k.provider] = k;
    return acc;
  }, {} as Record<string, typeof keys[0]>);

  const modelList: ReturnType<typeof makeModel>[] = [];

  for (const [provider, key] of Object.entries(primaryByProvider)) {
    const apiKey = decrypt(key.encryptedKey);

    if (key.customEndpoint) {
      // Try live fetch first
      const live = await tryFetchModels(apiKey, key);
      if (live.length > 0) {
        live.forEach(id => modelList.push(makeModel(id, provider)));
      } else {
        // Live fetch failed or returned nothing — use provider name as model ID
        // This guarantees something always shows in the dropdown
        modelList.push(makeModel(provider, provider));
      }
    } else if (provider === "openai") {
      // Try live, fall back to static
      const live = await tryFetchModels(apiKey, { ...key, customEndpoint: "https://api.openai.com/v1/chat/completions" });
      const ids = live.length > 0 ? live : STATIC_MODELS.openai;
      ids.forEach(id => modelList.push(makeModel(id, "openai")));
    } else if (STATIC_MODELS[provider]) {
      STATIC_MODELS[provider].forEach(id => modelList.push(makeModel(id, provider)));
    } else {
      // Unknown provider with no custom endpoint — show provider name
      modelList.push(makeModel(provider, provider));
    }
  }

  // Absolute last resort — DB has keys but loop produced nothing
  if (modelList.length === 0) {
    Object.keys(primaryByProvider).forEach(p => modelList.push(makeModel(p, p)));
  }

  return NextResponse.json(
    { object: "list", data: modelList },
    { headers: CORS_HEADERS }
  );
}
