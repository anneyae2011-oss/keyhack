/**
 * GET /api/v1/models
 * Returns available models from all configured providers.
 * Fetches live from each provider using the stored keys.
 */
import { NextRequest, NextResponse } from "next/server";
import { validateGatewayKey } from "@/lib/auth";
import { db, providerKeys } from "@/lib/db";
import { decrypt } from "@/lib/gateway/crypto";
import { eq, and } from "drizzle-orm";
import { ensureTables } from "@/lib/db/migrate";

// Static model lists for providers that don't have a /models endpoint
const STATIC_MODELS: Record<string, string[]> = {
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
  mistral: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", "mixtral-8x7b-instruct-v0.1", "open-mistral-7b"],
};

async function fetchOpenAIModels(apiKey: string, baseUrl = "https://api.openai.com"): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? [])
      .map((m: { id: string }) => m.id)
      .filter((id: string) => id.includes("gpt") || id.includes("o1") || id.includes("o3") || id.includes("o4"))
      .sort();
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  await ensureTables();

  const auth = await validateGatewayKey(req);
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.error, type: "auth_error" } }, { status: 401 });
  }

  // Get one active key per provider (lowest priority = primary)
  const keys = await db
    .select()
    .from(providerKeys)
    .where(and(eq(providerKeys.isActive, true)));

  // Group by provider, pick the primary (lowest priority) key
  const byProvider = keys.reduce((acc, k) => {
    if (!acc[k.provider] || k.priority < acc[k.provider].priority) acc[k.provider] = k;
    return acc;
  }, {} as Record<string, typeof keys[0]>);

  const models: { id: string; provider: string; object: "model" }[] = [];

  for (const [provider, key] of Object.entries(byProvider)) {
    const apiKey = decrypt(key.encryptedKey);

    if (provider === "openai") {
      const list = await fetchOpenAIModels(apiKey);
      list.forEach(id => models.push({ id, provider, object: "model" }));
    } else if (provider === "custom" || key.customEndpoint) {
      // Try fetching /models from the custom endpoint base
      try {
        const base = key.customEndpoint!.replace(/\/chat\/completions\/?$/, "").replace(/\/v\d+\/?$/, "");
        const authHeader = key.customAuthStyle === "bearer" ? { Authorization: `Bearer ${apiKey}` }
          : key.customAuthStyle === "header" && key.customAuthHeader ? { [key.customAuthHeader]: apiKey }
          : {};
        const res = await fetch(`${base}/v1/models`, {
          headers: { "Content-Type": "application/json", ...authHeader },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          const list: string[] = (data.data ?? data.models ?? []).map((m: { id?: string; name?: string }) => m.id ?? m.name ?? "").filter(Boolean);
          list.forEach(id => models.push({ id, provider: key.name, object: "model" }));
        } else {
          // Fallback: just show the provider name as a placeholder
          models.push({ id: `${key.name}/default`, provider: key.name, object: "model" });
        }
      } catch {
        models.push({ id: `${key.name}/default`, provider: key.name, object: "model" });
      }
    } else if (STATIC_MODELS[provider]) {
      STATIC_MODELS[provider].forEach(id => models.push({ id, provider, object: "model" }));
    }
  }

  // OpenAI-compatible response format
  return NextResponse.json({
    object: "list",
    data: models,
  });
}
