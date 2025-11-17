import { NextResponse } from "next/server";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import { getAnalyticsSummary } from "@/lib/services/global-admin/analytics";

export async function GET(request: Request) {
  await requireGlobalAdminFromRequest(request);
  const summary = await getAnalyticsSummary();
  return NextResponse.json({ data: summary });
}
