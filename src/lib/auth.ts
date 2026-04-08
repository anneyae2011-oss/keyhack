import { db, gatewayKeys } from "@/lib/db";
import { hashKey } from "@/lib/gateway/crypto";
import { eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { ensureTables } from "@/lib/db/migrate";

export async function validateGatewayKey(req: NextRequest): Promise<{ valid: boolean; keyId?: string; error?: string }> {
  await ensureTables();
  const authHeader = req.headers.get("authorization") ?? "";
  const key = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : req.headers.get("x-api-key") ?? "";

  if (!key) return { valid: false, error: "Missing API key. Provide via Authorization: Bearer <key> or X-Api-Key header." };

  const hash = hashKey(key);
  const [found] = await db.select().from(gatewayKeys).where(eq(gatewayKeys.keyHash, hash)).limit(1);

  if (!found) return { valid: false, error: "Invalid API key." };
  if (!found.isActive) return { valid: false, error: "API key is disabled." };

  // Update usage stats
  await db.update(gatewayKeys)
    .set({ totalRequests: sql`${gatewayKeys.totalRequests} + 1`, lastUsedAt: new Date() })
    .where(eq(gatewayKeys.id, found.id));

  return { valid: true, keyId: found.id };
}
