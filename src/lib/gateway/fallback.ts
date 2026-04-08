/**
 * NanaTwo AI Gateway — API Key Fallback Engine
 *
 * When a provider key returns an error (rate limit, invalid key, quota exceeded, etc.)
 * this engine automatically retries with the next available key in priority order.
 */

import { db, providerKeys } from "@/lib/db";
import { decrypt } from "./crypto";
import { eq, asc, and, sql } from "drizzle-orm";

export type Provider = "openai" | "anthropic" | "google" | "cohere" | "mistral";

// Errors that should trigger a fallback to the next key
const FALLBACK_STATUS_CODES = new Set([401, 403, 429, 500, 502, 503, 504]);
const FALLBACK_ERROR_PATTERNS = [
  /invalid.api.key/i,
  /api.key.not.found/i,
  /quota.exceeded/i,
  /rate.limit/i,
  /insufficient.quota/i,
  /billing/i,
  /unauthorized/i,
  /forbidden/i,
];

function shouldFallback(status: number, errorText: string): boolean {
  if (FALLBACK_STATUS_CODES.has(status)) return true;
  return FALLBACK_ERROR_PATTERNS.some((p) => p.test(errorText));
}

export interface FallbackResult {
  response: Response;
  usedKeyId: string;
  fallbackUsed: boolean;
  attempts: number;
}

export async function fetchWithFallback(
  provider: Provider,
  buildRequest: (apiKey: string) => { url: string; init: RequestInit }
): Promise<FallbackResult> {
  // Load all active keys for this provider, ordered by priority (1 = primary first)
  const keys = await db
    .select()
    .from(providerKeys)
    .where(and(eq(providerKeys.provider, provider), eq(providerKeys.isActive, true)))
    .orderBy(asc(providerKeys.priority));

  if (keys.length === 0) {
    throw new Error(`No active API keys configured for provider: ${provider}`);
  }

  let lastResponse: Response | null = null;
  let lastError = "";
  let attempts = 0;

  for (const key of keys) {
    attempts++;
    const decryptedKey = decrypt(key.encryptedKey);
    const { url, init } = buildRequest(decryptedKey);

    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (networkErr) {
      // Network error — mark and try next key
      await markKeyError(key.id);
      lastError = String(networkErr);
      continue;
    }

    if (res.ok) {
      await markKeySuccess(key.id);
      return {
        response: res,
        usedKeyId: key.id,
        fallbackUsed: attempts > 1,
        attempts,
      };
    }

    // Clone so we can read body for error detection without consuming the stream
    const cloned = res.clone();
    let bodyText = "";
    try {
      bodyText = await cloned.text();
    } catch {}

    if (shouldFallback(res.status, bodyText)) {
      await markKeyError(key.id);
      lastResponse = res;
      lastError = bodyText;
      // Continue to next key
      continue;
    }

    // Non-fallback error (e.g. 400 bad request) — return immediately
    await markKeySuccess(key.id); // key itself is fine
    return { response: res, usedKeyId: key.id, fallbackUsed: attempts > 1, attempts };
  }

  // All keys exhausted — return last error response or synthetic 503
  if (lastResponse) {
    return { response: lastResponse, usedKeyId: "", fallbackUsed: true, attempts };
  }
  return {
    response: new Response(
      JSON.stringify({ error: { message: `All ${provider} API keys exhausted. Last error: ${lastError}`, type: "gateway_error" } }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    ),
    usedKeyId: "",
    fallbackUsed: true,
    attempts,
  };
}

async function markKeyError(id: string) {
  await db.update(providerKeys)
    .set({ errorCount: sql`${providerKeys.errorCount} + 1`, lastErrorAt: new Date() })
    .where(eq(providerKeys.id, id));
}

async function markKeySuccess(id: string) {
  await db.update(providerKeys)
    .set({ successCount: sql`${providerKeys.successCount} + 1`, lastUsedAt: new Date() })
    .where(eq(providerKeys.id, id));
}
