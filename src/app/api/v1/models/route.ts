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

// Full static model lists — shown even if live fetch fails
const STATIC_MODELS: Record<string, string[]> = {
  openai: [
    "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4",
    "gpt-3.5-turbo", "o1", "o1-mini", "o3-mini",
  ],
  anthropic: [
    "claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5",
    "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307",
  ],
  google: [
    "gemini-2.0-flash", "gemini-2.0-flash-lite",
    "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b",
  ],
  cohere: ["command-r-plus", "command-r", "command", "command-light"],
  mistral: [
    "mistral-large-latest", "mistral-medium-latest", "mistral-small-latest",
    "mixtral-8x7b-instruct-v0.1", "open-mistral-7b",
  ],
};

function makeModel(id: string, provider: string) {
  return { id, object: "model", created: 1700000000, owned_by: provider };
}

async function fetchLiveOpenAIModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? [])
      .map((m: { id: string }) => m.id)
      .filter((id: string) =>
        id.startsWith("gpt-") || id.startsWith("o1") || id.startsWith("o3") || id.startsWith("o4")
      )
      .sort();
  } catch { return []; }
}

async function fetchLiveCustomModels(apiKey: string, key: typeof providerKeys.$inferSelect): Promise<string[]> {
  try {
    const base = (key.customEndpoint ?? "")
      .replace(/\/chat\/completions\/?$/, "")
      .replace(/\/completions\/?$/, "");
    const authHeaders: Record<string, string> = {};
    if (key.customAuthStyle === "bearer") authHeaders["Authorization"] = `Bearer ${apiKey}`;
    else if (key.customAuthStyle === "header" && key.customAuthHeader) authHeaders[key.customAuthHeader] = apiKey;

    const res = await fetch(`${base}/models`, {
      headers: { ...authHeaders },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? data.models ?? [])
      .map((m: { id?: string; name?: string }) => m.id ?? m.name ?? "")
      .filter(Boolean);
  } catch { return []; }
}

// Handle CORS preflight
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

  // Load all active provider keys, pick lowest priority per provider
  const keys = await db.select().from(providerKeys).where(eq(providerKeys.isActive, true));

  const primaryByProvider = keys.reduce((acc, k) => {
    if (!acc[k.provider] || k.priority < acc[k.provider].priority) acc[k.provider] = k;
    return acc;
  }, {} as Record<string, typeof keys[0]>);

  const modelList: ReturnType<typeof makeModel>[] = [];

  for (const [provider, key] of Object.entries(primaryByProvider)) {
    const apiKey = decrypt(key.encryptedKey);

    if (provider === "openai") {
      // Try live fetch first, fall back to static list
      const live = await fetchLiveOpenAIModels(apiKey);
      const ids = live.length > 0 ? live : STATIC_MODELS.openai;
      ids.forEach(id => modelList.push(makeModel(id, "openai")));

    } else if (key.customEndpoint) {
      // Custom provider — try live fetch, fall back to single entry
      const live = await fetchLiveCustomModels(apiKey, key);
      if (live.length > 0) {
        live.forEach(id => modelList.push(makeModel(id, key.name)));
      } else {
        // Show the endpoint itself as a selectable model ID
        modelList.push(makeModel(key.name, key.name));
      }

    } else if (STATIC_MODELS[provider]) {
      STATIC_MODELS[provider].forEach(id => modelList.push(makeModel(id, provider)));
    }
  }

  // If no keys configured at all, return the static lists so the dropdown isn't empty
  if (modelList.length === 0) {
    Object.entries(STATIC_MODELS).forEach(([provider, ids]) =>
      ids.forEach(id => modelList.push(makeModel(id, provider)))
    );
  }

  return NextResponse.json(
    { object: "list", data: modelList },
    { headers: CORS_HEADERS }
  );
}
