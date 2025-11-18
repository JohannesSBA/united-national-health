import { randomBytes } from "crypto";
import { hashPassword } from "better-auth/crypto";

import { ActivityCategory, UserStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sendTemporaryPasswordEmail } from "@/lib/email";
import { recordAdminActivity } from "./activity";

async function getRoleId(name: string) {
  const role = await db.role.findUnique({ where: { name } });
  if (!role) {
    throw new Error(`Role ${name} not configured`);
  }
  return role.id;
}

function generateTempPassword() {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

export async function createHospitalAdmin(
  {
    email,
    name,
    hospitalIds,
  }: { email: string; name: string; hospitalIds: string[] },
  actor: string,
) {
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("User already exists");
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const hospitalAdminRoleId = await getRoleId("HospitalAdmin");

  const user = await db.user.create({
    data: {
      email,
      name,
      emailVerified: false,
      status: UserStatus.ACTIVE,
    },
  });

  await db.account.create({
    data: {
      providerId: "credential",
      accountId: user.id,
      userId: user.id,
      password: passwordHash,
    },
  });

  await db.userRole.create({
    data: {
      userId: user.id,
      roleId: hospitalAdminRoleId,
    },
  });

  await Promise.all(
    hospitalIds.map((hospitalId) =>
      db.hospitalUser.create({
        data: { hospitalId, userId: user.id },
      }),
    ),
  );

  const emailLogId = await sendTemporaryPasswordEmail({
    to: user.email,
    name,
    temporaryPassword: tempPassword,
  });

  await recordAdminActivity(
    actor,
    `Created hospital admin ${name}`,
    "Hospital Access",
    ActivityCategory.ACCESS,
    emailLogId ? { emailLogId } : undefined,
  );

  return { user, temporaryPassword: tempPassword };
}

export async function reassignHospitalAdmin(
  userId: string,
  hospitalIds: string[],
  actor: string,
) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  await db.hospitalUser.deleteMany({
    where: { userId },
  });

  await Promise.all(
    hospitalIds.map((hospitalId) =>
      db.hospitalUser.create({
        data: { hospitalId, userId },
      }),
    ),
  );

  await recordAdminActivity(
    actor,
    `Reassigned hospital admin ${userId} to ${hospitalIds.length} hospital(s)`,
    "Hospital Access",
    ActivityCategory.ACCESS,
  );
}

export async function updateHospitalAdminStatus(
  userId: string,
  status: UserStatus,
  actor: string,
) {
  await db.user.update({
    where: { id: userId },
    data: { status },
  });

  await recordAdminActivity(
    actor,
    `${status === UserStatus.SUSPENDED ? "Suspended" : "Reactivated"} hospital admin ${userId}`,
    "Hospital Access",
    ActivityCategory.ACCESS,
  );
}

export async function resetHospitalAdminPassword(
  userId: string,
  actor: string,
) {
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const user = await db.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new Error("User not found");
  }

  await db.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: userId,
      },
    },
    update: { password: passwordHash, userId },
    create: {
      providerId: "credential",
      accountId: userId,
      userId,
      password: passwordHash,
    },
  });

  const emailLogId = await sendTemporaryPasswordEmail({
    to: user.email,
    name: user.name,
    temporaryPassword: tempPassword,
  });

  await recordAdminActivity(
    actor,
    `Reset credentials for admin ${userId}`,
    "Hospital Access",
    ActivityCategory.SECURITY,
    emailLogId ? { emailLogId } : undefined,
  );

  return { temporaryPassword: tempPassword };
}
