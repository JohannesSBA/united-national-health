import { NextResponse } from "next/server";

import { ensureHospitalAdminCsrfToken } from "@/lib/hospital-admin-csrf";
import { requireHospitalAdminFromRequest } from "@/lib/require-hospital-admin";

export async function GET(request: Request) {
  await requireHospitalAdminFromRequest(request);
  const token = await ensureHospitalAdminCsrfToken();
  return NextResponse.json({ token });
}
