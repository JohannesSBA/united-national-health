import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const user = session.user;

  const userInfo = await db.userRole.findMany({
    where: { userId: user.id },
    include: { role: true },
  });
  return new NextResponse(JSON.stringify({ user: user, roles: userInfo }), {
    status: 200,
  });
}
