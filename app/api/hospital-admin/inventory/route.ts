import { NextResponse } from "next/server";

import { buildAuditContext } from "@/lib/audit-context";
import { requireHospitalAdminFromRequest } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import {
  listInventory,
  upsertInventoryItem,
} from "@/lib/services/hospital-admin/inventory";
import { inventorySchema } from "@/lib/validation/hospital-admin";

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET(request: Request) {
  const session = await requireHospitalAdminFromRequest(request);
  const url = new URL(request.url);
  try {
    const scope = await getHospitalScope(
      session.user.id,
      url.searchParams.get("hospitalId") ?? undefined,
    );
    const items = await listInventory(scope.hospitalId);
    return NextResponse.json({ data: items });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await requireHospitalAdminFromRequest(request);
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const auditContext = buildAuditContext(request.headers);

  try {
    const scope = await getHospitalScope(
      session.user.id,
      url.searchParams.get("hospitalId") ?? undefined,
    );
    const payload = inventorySchema.parse({
      ...body,
      hospitalId: scope.hospitalId,
    });
    const item = await upsertInventoryItem(
      session.user.id,
      payload,
      auditContext,
    );
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}
