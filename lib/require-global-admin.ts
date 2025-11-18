import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
  }
}

async function validateGlobalAdminSession(headerSource: HeadersInit) {
  const session = await auth.api.getSession({
    headers: headerSource,
  });

  if (!session?.user) {
    throw new UnauthorizedError();
  }

  const hasRole = await db.userRole.findFirst({
    where: {
      userId: session.user.id,
      role: {
        name: "GlobalAdmin",
      },
    },
  });

  if (!hasRole) {
    throw new ForbiddenError();
  }

  return session;
}

export async function requireGlobalAdmin() {
  try {
    return await validateGlobalAdminSession(await headers());
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    redirect("/");
  }
}

export async function requireGlobalAdminFromRequest(request: Request) {
  return validateGlobalAdminSession(request.headers);
}
