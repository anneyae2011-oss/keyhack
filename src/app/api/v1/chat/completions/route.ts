/**
 * NanaTwo Gateway — /api/v1/chat/completions
 * OpenAI-compatible endpoint. Routes to the correct provider with automatic key fallback.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateGatewayKey } from "@/lib/auth";
import { fetchWithFallback, Provider } from "@/lib/gateway/fallback";
import { buildOpenAIRequest, buildAnthropicRequest, buildGoogleRequest, buildMistralRequest, buildCohereRequest } from "@/lib/gateway/providers";
import { db, requestLogs } from "@/lib/db";

const PROVIDER_MODELS: Record<string, Provider> = {
  "gpt-": "openai",
  "o1": "openai",
  "o3": "openai",
  "claude-": "anthropic",
  "gemini-": "google",
  "command": "cohere",
  "mistral": "mistral",
  "mixtral": "mistral",
};

function detectProvider(model: string): Provider {
  for (const [prefix, provider] of Object.entries(PROVIDER_MODELS)) {
    if (model.toLowerCase().startsWith(prefix)) return provider;
  }
  return "openai"; // default
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  // 1. Validate gateway API key
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
  const provider = (body.provider as Provider) ?? detectProvider(model);

  // Remove internal fields before forwarding
  const { provider: _p, ...forwardBody } = body;

  // 2. Build provider-specific request builder
  const buildRequest = (apiKey: string) => {
    switch (provider) {
      case "anthropic": return buildAnthropicRequest(apiKey, forwardBody);
      case "google": return buildGoogleRequest(apiKey, forwardBody, model);
      case "cohere": return buildCohereRequest(apiKey, forwardBody);
      case "mistral": return buildMistralRequest(apiKey, forwardBody);
      default: return buildOpenAIRequest(apiKey, forwardBody);
    }
  };

  // 3. Execute with automatic fallback
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

  // 4. Log the request
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

  // 5. Return provider response with gateway headers
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("X-NanaTwo-Provider", provider);
  headers.set("X-NanaTwo-Fallback-Used", String(result.fallbackUsed));
  headers.set("X-NanaTwo-Attempts", String(result.attempts));
  headers.set("X-NanaTwo-Latency-Ms", String(latency));

  return new NextResponse(responseBody, { status: result.response.status, headers });
}
