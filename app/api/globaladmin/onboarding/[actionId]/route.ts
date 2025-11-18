import { NextResponse } from "next/server";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import { handleOnboardingDecision } from "@/lib/services/global-admin/hospitals";

type Params = {
  params: Promise<{ actionId: string }>;
};

export async function PATCH(request: Request, context: Params) {
  const session = await requireGlobalAdminFromRequest(request);
  const { actionId } = await context.params;
  if (!actionId) {
    return NextResponse.json(
      { error: "Onboarding action id required" },
      { status: 400 },
    );
  }
  const body = await request.json();
  const result = await handleOnboardingDecision(
    actionId,
    body.decision,
    session.user.id,
  );
  return NextResponse.json({ data: result });
}
