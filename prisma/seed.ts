import { hashPassword } from "better-auth/crypto";

import { db } from "../lib/db";

const roles = [
  "GlobalAdmin",
  "HospitalAdmin",
  "Doctor",
  "Nurse",
  "Pharmacist",
  "LabTech",
  "Registrar",
  "Billing",
  "Receptionist",
  "CareCoordinator",
];

async function main() {
  await Promise.all(
    roles.map((name) =>
      db.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@unh.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow!123";
  const adminName = process.env.SEED_ADMIN_NAME ?? "System Administrator";

  const globalAdminRole = await db.role.findUnique({
    where: { name: "GlobalAdmin" },
  });

  if (!globalAdminRole) {
    throw new Error("GlobalAdmin role missing; seed aborted.");
  }

  const passwordHash = await hashPassword(adminPassword);

  const adminUser = await db.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      emailVerified: true,
    },
    create: {
      email: adminEmail,
      name: adminName,
      emailVerified: true,
    },
  });

  await db.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: adminUser.id,
      },
    },
    update: {
      userId: adminUser.id,
      password: passwordHash,
    },
    create: {
      providerId: "credential",
      accountId: adminUser.id,
      userId: adminUser.id,
      password: passwordHash,
    },
  });

  await db.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: globalAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: globalAdminRole.id,
    },
  });

  console.log(
    `Seeded ${roles.length} roles and ensured admin user ${adminEmail}`,
  );
  console.log(
    `Local admin credentials -> email: ${adminEmail}, password: ${adminPassword}`,
  );
}

main()
  .catch((error) => {
    console.error("Failed seeding base roles", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
