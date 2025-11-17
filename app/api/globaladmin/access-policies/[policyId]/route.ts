import { NextResponse } from "next/server";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import {
  approveAccessPolicy,
  revokeAccessPolicy,
} from "@/lib/services/global-admin/system";

type Params = { params: Promise<{ policyId: string }> };

export async function PATCH(request: Request, context: Params) {
  const session = await requireGlobalAdminFromRequest(request);
  const { policyId } = await context.params;
  const body = await request.json();
  if (body.action === "approve") {
    const policy = await approveAccessPolicy(policyId, session.user.id);
    return NextResponse.json({ data: policy });
  }
  if (body.action === "revoke") {
    const policy = await revokeAccessPolicy(policyId, session.user.id);
    return NextResponse.json({ data: policy });
  }
  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
