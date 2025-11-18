import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import { createAccessPolicy } from "@/lib/services/global-admin/system";

export async function GET(request: Request) {
  await requireGlobalAdminFromRequest(request);
  const policies = await db.accessPolicy.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ data: policies });
}

export async function POST(request: Request) {
  const session = await requireGlobalAdminFromRequest(request);
  const body = await request.json();
  const policy = await createAccessPolicy(
    {
      name: body.name,
      description: body.description,
      hospitalScope: body.hospitalScope ?? [],
    },
    session.user.id,
  );
  return NextResponse.json({ data: policy }, { status: 201 });
}
