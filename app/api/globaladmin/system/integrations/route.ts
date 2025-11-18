import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import { createIntegrationKey } from "@/lib/services/global-admin/system";

export async function GET(request: Request) {
  await requireGlobalAdminFromRequest(request);
  const integrations = await db.integrationKey.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: integrations });
}

export async function POST(request: Request) {
  const session = await requireGlobalAdminFromRequest(request);
  const body = await request.json();
  const { integration, token } = await createIntegrationKey(
    {
      name: body.name,
      description: body.description,
    },
    session.user.id,
  );

  return NextResponse.json({ data: integration, token }, { status: 201 });
}
