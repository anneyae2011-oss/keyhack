import { NextRequest, NextResponse } from "next/server";
import { db, requestLogs } from "@/lib/db";
import { desc } from "drizzle-orm";

function adminAuth(req: NextRequest): boolean {
  return req.headers.get("x-admin-secret") === process.env.GATEWAY_SECRET;
}

export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "100");
  const logs = await db.select().from(requestLogs).orderBy(desc(requestLogs.createdAt)).limit(limit);
  return NextResponse.json(logs);
}
