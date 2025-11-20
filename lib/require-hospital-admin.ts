import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserStatus } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ForbiddenError, UnauthorizedError } from "@/lib/require-global-admin";

async function validateHospitalAdminSession(headerSource: HeadersInit) {
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
            name: "HospitalAdmin",
          },
        },
      },
    },
  });

  if (!userRecord) {
    throw new ForbiddenError();
  }

  return session;
}

export async function requireHospitalAdmin() {
  try {
    return await validateHospitalAdminSession(await headers());
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }

    redirect("/");
  }
}

export async function requireHospitalAdminFromRequest(request: Request) {
  return validateHospitalAdminSession(request.headers);
}
