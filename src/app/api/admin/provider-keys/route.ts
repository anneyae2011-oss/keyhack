import { NextRequest, NextResponse } from "next/server";
import { db, providerKeys } from "@/lib/db";
import { encrypt } from "@/lib/gateway/crypto";
import { eq } from "drizzle-orm";
import { ensureTables } from "@/lib/db/migrate";

function adminAuth(req: NextRequest): boolean {
  return req.headers.get("x-admin-secret") === process.env.GATEWAY_SECRET;
}

export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTables();
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
  await ensureTables();

  const {
    provider, name, apiKey, priority = 1,
    customEndpoint, customAuthStyle, customAuthHeader, customAuthQuery, customHeaders,
  } = await req.json();

  if (!provider || !name) return NextResponse.json({ error: "provider and name are required" }, { status: 400 });
  if (provider === "custom" && !customEndpoint) return NextResponse.json({ error: "customEndpoint is required for custom providers" }, { status: 400 });

  const keyToStore = apiKey ?? "";
  const encrypted = encrypt(keyToStore);
  const preview = keyToStore.length >= 4 ? `...${keyToStore.slice(-4)}` : keyToStore.length > 0 ? "...****" : "(none)";

  const [created] = await db.insert(providerKeys).values({
    provider, name, encryptedKey: encrypted, keyPreview: preview, priority,
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

export async function PUT(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, apiKey, priority, customEndpoint, customAuthStyle, customAuthHeader, customAuthQuery, customHeaders } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (priority !== undefined) updates.priority = priority;
  if (customEndpoint !== undefined) updates.customEndpoint = customEndpoint;
  if (customAuthStyle !== undefined) updates.customAuthStyle = customAuthStyle;
  if (customAuthHeader !== undefined) updates.customAuthHeader = customAuthHeader;
  if (customAuthQuery !== undefined) updates.customAuthQuery = customAuthQuery;
  if (customHeaders !== undefined) updates.customHeaders = customHeaders;
  if (apiKey) {
    updates.encryptedKey = encrypt(apiKey);
    updates.keyPreview = `...${apiKey.slice(-4)}`;
  }

  await db.update(providerKeys).set(updates).where(eq(providerKeys.id, id));
  return NextResponse.json({ success: true });
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
