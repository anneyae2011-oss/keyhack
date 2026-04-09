import { NextRequest, NextResponse } from "next/server";
import { db, gatewayKeys } from "@/lib/db";
import { generateGatewayKey, hashKey } from "@/lib/gateway/crypto";
import { eq } from "drizzle-orm";
import { ensureTables } from "@/lib/db/migrate";

function adminAuth(req: NextRequest): boolean {
  return req.headers.get("x-admin-secret") === process.env.GATEWAY_SECRET;
}

export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureTables();
    const keys = await db.select({
      id: gatewayKeys.id,
      name: gatewayKeys.name,
      keyPrefix: gatewayKeys.keyPrefix,
      isActive: gatewayKeys.isActive,
      totalRequests: gatewayKeys.totalRequests,
      totalTokens: gatewayKeys.totalTokens,
      createdAt: gatewayKeys.createdAt,
      lastUsedAt: gatewayKeys.lastUsedAt,
    }).from(gatewayKeys);
    return NextResponse.json(keys);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureTables();
    const body = await req.json();
    const name = body?.name?.trim();
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const rawKey = generateGatewayKey();
    const hash = hashKey(rawKey);
    const prefix = rawKey.slice(0, 12);

    const [created] = await db
      .insert(gatewayKeys)
      .values({ name, keyHash: hash, keyPrefix: prefix })
      .returning();

    return NextResponse.json({ ...created, key: rawKey }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await req.json();
    await db.update(gatewayKeys).set({ isActive: false }).where(eq(gatewayKeys.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
