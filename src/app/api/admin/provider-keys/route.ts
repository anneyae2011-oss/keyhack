import { NextRequest, NextResponse } from "next/server";
import { db, providerKeys } from "@/lib/db";
import { encrypt } from "@/lib/gateway/crypto";
import { eq } from "drizzle-orm";

function adminAuth(req: NextRequest): boolean {
  return req.headers.get("x-admin-secret") === process.env.GATEWAY_SECRET;
}

export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const keys = await db.select({
    id: providerKeys.id,
    provider: providerKeys.provider,
    name: providerKeys.name,
    keyPreview: providerKeys.keyPreview,
    priority: providerKeys.priority,
    isActive: providerKeys.isActive,
    errorCount: providerKeys.errorCount,
    successCount: providerKeys.successCount,
    lastErrorAt: providerKeys.lastErrorAt,
    lastUsedAt: providerKeys.lastUsedAt,
    createdAt: providerKeys.createdAt,
  }).from(providerKeys);
  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { provider, name, apiKey, priority = 1 } = await req.json();
  if (!provider || !name || !apiKey) return NextResponse.json({ error: "provider, name, apiKey required" }, { status: 400 });

  const encrypted = encrypt(apiKey);
  const preview = `...${apiKey.slice(-4)}`;

  const [created] = await db.insert(providerKeys).values({
    provider, name, encryptedKey: encrypted, keyPreview: preview, priority,
  }).returning({ id: providerKeys.id, provider: providerKeys.provider, name: providerKeys.name, keyPreview: providerKeys.keyPreview, priority: providerKeys.priority });

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await db.update(providerKeys).set({ isActive: false }).where(eq(providerKeys.id, id));
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, priority, isActive } = await req.json();
  const updates: Record<string, unknown> = {};
  if (priority !== undefined) updates.priority = priority;
  if (isActive !== undefined) updates.isActive = isActive;
  await db.update(providerKeys).set(updates).where(eq(providerKeys.id, id));
  return NextResponse.json({ success: true });
}
