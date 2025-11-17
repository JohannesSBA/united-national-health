import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import { raiseSecurityAlert } from "@/lib/services/global-admin/activity";

export async function GET(request: Request) {
  await requireGlobalAdminFromRequest(request);
  const alerts = await db.securityAlert.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: alerts });
}

export async function POST(request: Request) {
  await requireGlobalAdminFromRequest(request);
  const body = await request.json();
  const alert = await raiseSecurityAlert({
    type: body.type,
    severity: body.severity,
    description: body.description,
  });
  return NextResponse.json({ data: alert }, { status: 201 });
}
