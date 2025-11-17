import { NextResponse } from "next/server";

import { getMaintenanceSetting } from "@/lib/services/global-admin/system";

export async function GET() {
  const maintenance = await getMaintenanceSetting();
  return NextResponse.json({ data: maintenance });
}
