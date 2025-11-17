import { NextResponse } from "next/server";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import { exportGovernanceReport } from "@/lib/services/global-admin/analytics";

export async function GET(request: Request) {
  await requireGlobalAdminFromRequest(request);
  const csv = await exportGovernanceReport();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="governance-report.csv"',
    },
  });
}
