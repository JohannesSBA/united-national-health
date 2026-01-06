import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserStatus } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ForbiddenError, UnauthorizedError } from "@/lib/require-global-admin";

async function validateReceptionistSession(headerSource: HeadersInit) {
  const session = await auth.api.getSession({
    headers: headerSource,
  });

  if (!session?.user) {
    throw new UnauthorizedError();
  }

  const userRecord = await db.user.findFirst({
    where: {
      id: session.user.id,
      status: UserStatus.ACTIVE,
      roles: {
        some: {
          role: {
            name: "RECEPTIONIST",
          },
        },
      },
    },
  });

  if (!userRecord) {
    throw new ForbiddenError();
  }

  if (!userRecord.emailVerified) {
    // Force onboarding flow
    throw new ForbiddenError("UNVERIFIED");
  }

  return session;
}

export async function requireReceptionist() {
  try {
    return await validateReceptionistSession(await headers());
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    if (error instanceof ForbiddenError && error.message === "UNVERIFIED") {
      redirect("/onboarding");
    }
    redirect("/");
  }
}

export async function requireReceptionistFromRequest(request: Request) {
  return validateReceptionistSession(request.headers);
}
