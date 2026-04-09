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

const BUILTIN = ["openai", "anthropic", "google", "cohere", "mistral"];

export const runtime = "edge"; // enable streaming on Vercel

export async function POST(req: NextRequest) {
  const start = Date.now();

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

  const model = (body.model as string) ?? "";
  const isStreaming = body.stream === true;
  const { provider: explicitProvider, ...forwardBody } = body;

  // Load every active provider from DB
  const activeRows = await db
    .select({ provider: providerKeys.provider })
    .from(providerKeys)
    .where(eq(providerKeys.isActive, true));

  const allActive = Array.from(new Set(activeRows.map(r => r.provider)));
  const customFirst = [
    ...allActive.filter(p => !BUILTIN.includes(p)),
    ...allActive.filter(p => BUILTIN.includes(p)),
  ];

  let provider: string;
  if (explicitProvider && typeof explicitProvider === "string") {
    provider = explicitProvider;
  } else if (customFirst.length === 1) {
    provider = customFirst[0];
  } else if (customFirst.length > 1) {
    const matched = customFirst.find(p => model.toLowerCase().includes(p.toLowerCase()));
    provider = matched ?? customFirst[0];
  } else {
    return NextResponse.json(
      { error: { message: "No provider keys configured.", type: "gateway_error" } },
      { status: 503 }
    );
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

  const responseHeaders = new Headers();
  responseHeaders.set("X-NanaTwo-Provider", provider);
  responseHeaders.set("X-NanaTwo-Fallback-Used", String(result.fallbackUsed));
  responseHeaders.set("X-NanaTwo-Attempts", String(result.attempts));
  responseHeaders.set("X-NanaTwo-Latency-Ms", String(latency));
  responseHeaders.set("Access-Control-Allow-Origin", "*");

  // ── Streaming ──────────────────────────────────────────────────────────────
  if (isStreaming && result.response.ok && result.response.body) {
    responseHeaders.set("Content-Type", "text/event-stream");
    responseHeaders.set("Cache-Control", "no-cache");
    responseHeaders.set("Connection", "keep-alive");

    // Log async without blocking the stream
    db.insert(requestLogs).values({
      gatewayKeyId: auth.keyId,
      provider, model,
      providerKeyId: result.usedKeyId || null,
      status: result.response.status,
      promptTokens: 0, completionTokens: 0,
      latencyMs: latency,
      error: null,
      fallbackUsed: result.fallbackUsed,
      fallbackAttempts: result.attempts,
    }).catch(() => {});

    // Pipe the stream directly through
    return new NextResponse(result.response.body, {
      status: result.response.status,
      headers: responseHeaders,
    });
  }

  // ── Non-streaming ──────────────────────────────────────────────────────────
  const responseBody = await result.response.text();

  let tokens = { prompt: 0, completion: 0 };
  try {
    const parsed = JSON.parse(responseBody);
    tokens.prompt = parsed?.usage?.prompt_tokens ?? parsed?.usage?.input_tokens ?? 0;
    tokens.completion = parsed?.usage?.completion_tokens ?? parsed?.usage?.output_tokens ?? 0;
  } catch {}

  await db.insert(requestLogs).values({
    gatewayKeyId: auth.keyId,
    provider, model,
    providerKeyId: result.usedKeyId || null,
    status: result.response.status,
    promptTokens: tokens.prompt,
    completionTokens: tokens.completion,
    latencyMs: latency,
    error: result.response.ok ? null : responseBody.slice(0, 500),
    fallbackUsed: result.fallbackUsed,
    fallbackAttempts: result.attempts,
  });

  responseHeaders.set("Content-Type", result.response.headers.get("content-type") ?? "application/json");
  return new NextResponse(responseBody, { status: result.response.status, headers: responseHeaders });
}
