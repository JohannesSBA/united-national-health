import { NextResponse } from "next/server";

import { requireHospitalAdminFromRequest } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import {
  analyticsToCsv,
  analyticsToPdf,
  getHospitalAnalyticsSnapshot,
} from "@/lib/services/hospital-admin/analytics";

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET(request: Request) {
  const session = await requireHospitalAdminFromRequest(request);
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "csv";
  try {
    const scope = await getHospitalScope(
      session.user.id,
      url.searchParams.get("hospitalId") ?? undefined,
    );
    const analytics = await getHospitalAnalyticsSnapshot(scope.hospitalId);
    if (format === "pdf") {
      const pdf = await analyticsToPdf(analytics);
      return new NextResponse(pdf, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": "attachment; filename=analytics.pdf",
        },
      });
    }
    const csv = analyticsToCsv(analytics);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=analytics.csv",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}
