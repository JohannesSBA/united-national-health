import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";

export async function GET(request: Request) {
  await requireGlobalAdminFromRequest(request);
  const logs = await db.adminActivity.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ data: logs });
}
