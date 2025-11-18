import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";

export async function GET(request: Request) {
  await requireGlobalAdminFromRequest(request);
  const policies = await db.rolePolicy.findMany({
    orderBy: { roleName: "asc" },
  });
  return NextResponse.json({ data: policies });
}

export async function PATCH(request: Request) {
  const session = await requireGlobalAdminFromRequest(request);
  const body = await request.json();
  const policy = await db.rolePolicy.upsert({
    where: { roleName: body.roleName },
    update: {
      permissions: body.permissions,
    },
    create: {
      roleName: body.roleName,
      permissions: body.permissions,
    },
  });

  return NextResponse.json({ data: policy });
}
