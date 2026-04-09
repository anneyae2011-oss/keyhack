import { NextRequest, NextResponse } from "next/server";
import { validateGatewayKey } from "@/lib/auth";
import { fetchWithFallback } from "@/lib/gateway/fallback";
import {
  buildOpenAIRequest, buildAnthropicRequest, buildGoogleRequest,
  buildMistralRequest, buildCohereRequest, buildCustomRequest,
} from "@/lib/gateway/providers";
import { db, providerKeys, requestLogs } from "@/lib/db";
import { ensureTables } from "@/lib/db/migrate";
import { eq } from "drizzle-orm";
import type { providerKeys as providerKeysType } from "@/lib/db/schema";

type KeyRecord = typeof providerKeysType.$inferSelect;

const PROVIDER_MODEL_PREFIXES: Record<string, string> = {
  "gpt-":    "openai",
  "o1":      "openai",
  "o3":      "openai",
  "o4":      "openai",
  "claude-": "anthropic",
  "gemini-": "google",
  "command": "cohere",
  "mistral": "mistral",
  "mixtral": "mistral",
};

function guessProviderFromModel(model: string): string {
  for (const [prefix, provider] of Object.entries(PROVIDER_MODEL_PREFIXES)) {
    if (model.toLowerCase().startsWith(prefix)) return provider;
  }
  return "openai";
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  await ensureTables();

  const auth = await validateGatewayKey(req);
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.error, type: "auth_error" } }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON body", type: "invalid_request_error" } }, { status: 400 });
  }

  const model = (body.model as string) ?? "gpt-4o-mini";
  const { provider: explicitProvider, ...forwardBody } = body;

  // Load all active provider names from DB
  const activeKeys = await db
    .select({ provider: providerKeys.provider })
    .from(providerKeys)
    .where(eq(providerKeys.isActive, true));

  const activeProviders = new Set(activeKeys.map(k => k.provider));

  let provider: string;

  if (explicitProvider && typeof explicitProvider === "string" && activeProviders.has(explicitProvider)) {
    // Explicit provider in request and it exists
    provider = explicitProvider;
  } else if (explicitProvider && typeof explicitProvider === "string") {
    // Explicit but not found — still try it, will get a clear error
    provider = explicitProvider;
  } else {
    const guessed = guessProviderFromModel(model);
    if (activeProviders.has(guessed)) {
      // Guessed provider has keys — use it
      provider = guessed;
    } else {
      // Guessed provider has NO keys — ignore the guess entirely,
      // just use the first configured provider (custom first, then built-ins)
      const all = Array.from(activeProviders);
      const custom = all.filter(p => !["openai","anthropic","google","cohere","mistral"].includes(p));
      provider = custom.length > 0 ? custom[0] : all[0] ?? guessed;
    }
  }

  const buildRequest = (apiKey: string, keyRecord: KeyRecord) => {
    if (keyRecord.customEndpoint) return buildCustomRequest(apiKey, forwardBody, keyRecord);
    switch (keyRecord.provider) {
      case "anthropic": return buildAnthropicRequest(apiKey, forwardBody);
      case "google":    return buildGoogleRequest(apiKey, forwardBody, model);
      case "cohere":    return buildCohereRequest(apiKey, forwardBody);
      case "mistral":   return buildMistralRequest(apiKey, forwardBody);
      default:          return buildOpenAIRequest(apiKey, forwardBody);
    }
  };

  let result;
  try {
    result = await fetchWithFallback(provider, buildRequest);
  } catch (err) {
    return NextResponse.json(
      { error: { message: String(err), type: "gateway_error" } },
      { status: 503 }
    );
  }

  const latency = Date.now() - start;
  const responseBody = await result.response.text();

  let tokens = { prompt: 0, completion: 0 };
  try {
    const parsed = JSON.parse(responseBody);
    tokens.prompt = parsed?.usage?.prompt_tokens ?? parsed?.usage?.input_tokens ?? 0;
    tokens.completion = parsed?.usage?.completion_tokens ?? parsed?.usage?.output_tokens ?? 0;
  } catch {}

  await db.insert(requestLogs).values({
    gatewayKeyId: auth.keyId,
    provider,
    model,
    providerKeyId: result.usedKeyId || null,
    status: result.response.status,
    promptTokens: tokens.prompt,
    completionTokens: tokens.completion,
    latencyMs: latency,
    error: result.response.ok ? null : responseBody.slice(0, 500),
    fallbackUsed: result.fallbackUsed,
    fallbackAttempts: result.attempts,
  });

  const headers = new Headers();
  headers.set("Content-Type", result.response.headers.get("content-type") ?? "application/json");
  headers.set("X-NanaTwo-Provider", provider);
  headers.set("X-NanaTwo-Fallback-Used", String(result.fallbackUsed));
  headers.set("X-NanaTwo-Attempts", String(result.attempts));
  headers.set("X-NanaTwo-Latency-Ms", String(latency));

  return new NextResponse(responseBody, { status: result.response.status, headers });
}
