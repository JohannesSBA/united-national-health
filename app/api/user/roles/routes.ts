import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  const userRoles = await db.userRole.findMany({
    where: { userId: session.user.id },
    include: { role: true },
  });
  console.log(userRoles);
  return new NextResponse(JSON.stringify({ roles: userRoles }), {
    status: 200,
  });
}
