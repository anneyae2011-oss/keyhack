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

// Static model lists — ONLY used when that provider has a key configured
const STATIC_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo", "o1", "o1-mini", "o3-mini"],
  anthropic: [
    "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307",
  ],
  google: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
  cohere: ["command-r-plus", "command-r", "command", "command-light"],
  mistral: ["mistral-large-latest", "mistral-small-latest", "mixtral-8x7b-instruct-v0.1"],
};

function makeModel(id: string, ownedBy: string) {
  return { id, object: "model", created: 1700000000, owned_by: ownedBy };
}

async function fetchOpenAIModelList(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? [])
      .map((m: { id: string }) => m.id)
      .filter((id: string) => id.startsWith("gpt-") || id.startsWith("o1") || id.startsWith("o3") || id.startsWith("o4"))
      .sort();
  } catch { return []; }
}

async function fetchCustomModelList(apiKey: string, key: typeof providerKeys.$inferSelect): Promise<string[]> {
  try {
    // Strip everything after /v1 to get the base, then append /v1/models
    const endpoint = key.customEndpoint ?? "";
    const base = endpoint
      .replace(/\/chat\/completions\/?$/, "")
      .replace(/\/completions\/?$/, "")
      .replace(/\/messages\/?$/, "")
      .replace(/\/$/, "");

    // base is now something like https://api.example.com/v1
    const modelsUrl = `${base}/models`;

    const authHeaders: Record<string, string> = {};
    if (key.customAuthStyle === "bearer" || !key.customAuthStyle) {
      authHeaders["Authorization"] = `Bearer ${apiKey}`;
    } else if (key.customAuthStyle === "header" && key.customAuthHeader) {
      authHeaders[key.customAuthHeader] = apiKey;
    }

    const res = await fetch(modelsUrl, {
      headers: authHeaders,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const list = (data.data ?? data.models ?? data.result ?? [])
      .map((m: { id?: string; name?: string; model?: string }) => m.id ?? m.name ?? m.model ?? "")
      .filter(Boolean);
    return list;
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

  // Get all active keys, pick primary (lowest priority) per provider
  const keys = await db.select().from(providerKeys).where(eq(providerKeys.isActive, true));

  const primaryByProvider = keys.reduce((acc, k) => {
    if (!acc[k.provider] || k.priority < acc[k.provider].priority) acc[k.provider] = k;
    return acc;
  }, {} as Record<string, typeof keys[0]>);

  const modelList: ReturnType<typeof makeModel>[] = [];

  for (const [provider, key] of Object.entries(primaryByProvider)) {
    const apiKey = decrypt(key.encryptedKey);

    if (key.customEndpoint) {
      // Custom provider — try live fetch, but ALWAYS show at least one entry
      const live = await fetchCustomModelList(apiKey, key);
      if (live.length > 0) {
        live.forEach(id => modelList.push(makeModel(id, provider)));
      }
      // Always guarantee at least one model shows up using the provider name
      if (modelList.filter(m => m.owned_by === provider).length === 0) {
        modelList.push(makeModel(provider, provider));
      }
    } else if (provider === "openai") {
      const live = await fetchOpenAIModelList(apiKey);
      const ids = live.length > 0 ? live : STATIC_MODELS.openai;
      ids.forEach(id => modelList.push(makeModel(id, "openai")));
    } else if (STATIC_MODELS[provider]) {
      // Built-in provider with static list — only shown because key exists
      STATIC_MODELS[provider].forEach(id => modelList.push(makeModel(id, provider)));
    }
  }

  return NextResponse.json(
    { object: "list", data: modelList },
    { headers: CORS_HEADERS }
  );

  // Last resort — if list is still empty, at minimum show every configured provider name
  if (modelList.length === 0) {
    Object.keys(primaryByProvider).forEach(p => modelList.push(makeModel(p, p)));
  }

  return NextResponse.json(
    { object: "list", data: modelList },
    { headers: CORS_HEADERS }
  );
}
