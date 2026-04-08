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
    customEndpoint: providerKeys.customEndpoint,
    customAuthStyle: providerKeys.customAuthStyle,
    customAuthHeader: providerKeys.customAuthHeader,
    customAuthQuery: providerKeys.customAuthQuery,
    customHeaders: providerKeys.customHeaders,
  }).from(providerKeys);
  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    provider, name, apiKey, priority = 1,
    // Custom provider fields
    customEndpoint, customAuthStyle, customAuthHeader, customAuthQuery, customHeaders,
  } = await req.json();

  if (!provider || !name) return NextResponse.json({ error: "provider and name are required" }, { status: 400 });

  // For custom providers, apiKey is optional (some endpoints need no auth)
  const keyToStore = apiKey ?? "";
  const encrypted = encrypt(keyToStore);
  const preview = keyToStore.length >= 4 ? `...${keyToStore.slice(-4)}` : keyToStore.length > 0 ? "...****" : "(none)";

  // Validate custom provider has an endpoint
  if (provider === "custom" && !customEndpoint) {
    return NextResponse.json({ error: "customEndpoint is required for custom providers" }, { status: 400 });
  }

  const [created] = await db.insert(providerKeys).values({
    provider,
    name,
    encryptedKey: encrypted,
    keyPreview: preview,
    priority,
    customEndpoint: customEndpoint ?? null,
    customAuthStyle: customAuthStyle ?? null,
    customAuthHeader: customAuthHeader ?? null,
    customAuthQuery: customAuthQuery ?? null,
    customHeaders: customHeaders ?? null,
  }).returning({
    id: providerKeys.id,
    provider: providerKeys.provider,
    name: providerKeys.name,
    keyPreview: providerKeys.keyPreview,
    priority: providerKeys.priority,
    customEndpoint: providerKeys.customEndpoint,
    customAuthStyle: providerKeys.customAuthStyle,
  });

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
