/**
 * POST /api/admin/debug-request
 * Shows exactly what NanaTwo would send to your custom provider — without actually sending it.
 * Use this to diagnose 403s and auth issues.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, providerKeys } from "@/lib/db";
import { decrypt } from "@/lib/gateway/crypto";
import { eq, and, asc } from "drizzle-orm";
import { ensureTables } from "@/lib/db/migrate";

function adminAuth(req: NextRequest) {
  return req.headers.get("x-admin-secret") === process.env.GATEWAY_SECRET;
}

export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTables();

  const { provider } = await req.json();
  if (!provider) return NextResponse.json({ error: "provider required" }, { status: 400 });

  const keys = await db
    .select()
    .from(providerKeys)
    .where(and(eq(providerKeys.provider, provider), eq(providerKeys.isActive, true)))
    .orderBy(asc(providerKeys.priority));

  if (keys.length === 0) {
    return NextResponse.json({ error: `No active keys found for provider: ${provider}` }, { status: 404 });
  }

  const result = keys.map(k => {
    const decrypted = decrypt(k.encryptedKey);
    const authStyle = k.customAuthStyle ?? "bearer";

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authStyle === "bearer") headers["Authorization"] = `Bearer ${decrypted}`;
    else if (authStyle === "header" && k.customAuthHeader) headers[k.customAuthHeader] = decrypted;

    if (k.customHeaders) {
      Object.assign(headers, k.customHeaders);
    }

    let url = k.customEndpoint ?? "(built-in)";
    if (authStyle === "query" && k.customAuthQuery) {
      url += `?${k.customAuthQuery}=<key>`;
    }

    return {
      priority: k.priority,
      name: k.name,
      endpoint: url,
      authStyle,
      authHeader: authStyle === "bearer" ? "Authorization: Bearer sk-...****" :
                  authStyle === "header" ? `${k.customAuthHeader}: <key>` :
                  authStyle === "query" ? `?${k.customAuthQuery}=<key>` : "none",
      // Show last 4 chars of key so you can verify it's the right one
      keyPreview: k.keyPreview,
      // Show full key — ONLY visible to admin
      fullKey: decrypted,
      headersBeingSent: {
        ...headers,
        // Mask the actual key value for safety in logs
        ...(headers["Authorization"] ? { Authorization: `Bearer ...${decrypted.slice(-4)}` } : {}),
        ...(authStyle === "header" && k.customAuthHeader ? { [k.customAuthHeader]: `...${decrypted.slice(-4)}` } : {}),
      },
    };
  });

  return NextResponse.json({ provider, keys: result });
}
