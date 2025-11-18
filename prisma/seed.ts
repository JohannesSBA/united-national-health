import { createHash, randomBytes } from "crypto";
import { hashPassword } from "better-auth/crypto";

import { db } from "../lib/db";
import {
  ActivityCategory,
  CrossAccessPolicyStatus,
  HospitalStatus,
  IntegrationStatus,
  OnboardingPriority,
  OnboardingStatus,
  SystemStatusState,
  UserStatus,
} from "../generated/prisma/client";

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

const hospitalSeeds = [
  {
    name: "Metro Regional Hospital",
    code: "METRO",
    region: "Northeast",
    contactEmail: "operations@metroregional.health",
    contactPhone: "+1-212-555-0199",
    status: HospitalStatus.ACTIVE,
    description: "Flagship tertiary hospital serving metropolitan regions.",
  },
  {
    name: "Coastal Emergency Center",
    code: "COASTAL",
    region: "Southeast",
    contactEmail: "command@coastalhealth.gov",
    contactPhone: "+1-305-555-4412",
    status: HospitalStatus.PENDING,
    description: "High-volume emergency response facility for coastal events.",
  },
  {
    name: "Northern Plains Children's",
    code: "NORTHERN",
    region: "Midwest",
    contactEmail: "connect@nplainschildren.org",
    contactPhone: "+1-701-555-6621",
    status: HospitalStatus.ACTIVE,
    description:
      "Pediatric network for rural hospitals across northern plains.",
  },
];

const onboardingSeeds = [
  {
    id: "onboarding-metro-compliance",
    hospital: "Metro Regional Hospital",
    action: "Approve compliance package and vendor attestations",
    owner: "Policy Review Board",
    dueDate: new Date("2025-03-18"),
    priority: OnboardingPriority.HIGH,
    status: OnboardingStatus.PENDING,
  },
  {
    id: "onboarding-coastal-admins",
    hospital: "Coastal Emergency Center",
    action: "Assign designated hospital administrators",
    owner: "Access Governance",
    dueDate: new Date("2025-03-20"),
    priority: OnboardingPriority.MEDIUM,
    status: OnboardingStatus.IN_PROGRESS,
  },
  {
    id: "onboarding-northern-legal",
    hospital: "Northern Plains Children's",
    action: "Verify cross-state data sharing agreements",
    owner: "Legal & Compliance",
    dueDate: new Date("2025-03-22"),
    priority: OnboardingPriority.MEDIUM,
    status: OnboardingStatus.PENDING,
  },
];

const activitySeeds = [
  {
    id: "activity-global-role",
    actor: "Amelia Robles",
    action: "Granted Global Admin role",
    scope: "Platform Roles",
    createdAt: new Date("2025-03-11T09:15:00Z"),
    category: ActivityCategory.GOVERNANCE,
  },
  {
    id: "activity-key-rotation",
    actor: "System Automation",
    action: "Rotated API signing keys",
    scope: "Security & Compliance",
    createdAt: new Date("2025-03-11T08:30:00Z"),
    category: ActivityCategory.SECURITY,
  },
  {
    id: "activity-onboarding-approval",
    actor: "Jules Carter",
    action: "Approved onboarding checklist",
    scope: "Hospital Governance",
    createdAt: new Date("2025-03-10T21:00:00Z"),
    category: ActivityCategory.ACCESS,
  },
];

type StaffSeed = {
  email: string;
  name: string;
  roles: string[];
  hospitals?: string[];
};

const hospitalAdminSeeds: StaffSeed[] = [
  {
    email: "operations.metro@unh.local",
    name: "Allison Mendez",
    roles: ["HospitalAdmin"],
    hospitals: ["Metro Regional Hospital"],
  },
  {
    email: "operations.coastal@unh.local",
    name: "Moises Patel",
    roles: ["HospitalAdmin"],
    hospitals: ["Coastal Emergency Center"],
  },
  {
    email: "operations.northern@unh.local",
    name: "Priya Banerjee",
    roles: ["HospitalAdmin"],
    hospitals: ["Northern Plains Children's"],
  },
];

const passwordCache = new Map<string, string>();
const integrationTokens: Record<string, string> = {};

async function getPasswordHash(password: string) {
  if (!passwordCache.has(password)) {
    passwordCache.set(password, await hashPassword(password));
  }
  return passwordCache.get(password)!;
}

async function ensureUser({
  email,
  name,
  password,
  roleIds,
  hospitalIds,
}: {
  email: string;
  name: string;
  password: string;
  roleIds: string[];
  hospitalIds?: string[];
}) {
  const passwordHash = await getPasswordHash(password);

  const user = await db.user.upsert({
    where: { email },
    update: {
      name,
      emailVerified: true,
      status: UserStatus.ACTIVE,
    },
    create: {
      email,
      name,
      emailVerified: true,
      status: UserStatus.ACTIVE,
    },
  });

  await db.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: user.id,
      },
    },
    update: {
      userId: user.id,
      password: passwordHash,
    },
    create: {
      providerId: "credential",
      accountId: user.id,
      userId: user.id,
      password: passwordHash,
    },
  });

  await Promise.all(
    roleIds.map((roleId) =>
      db.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId,
        },
      }),
    ),
  );

  if (hospitalIds?.length) {
    await Promise.all(
      hospitalIds.map((hospitalId) =>
        db.hospitalUser.upsert({
          where: {
            userId_hospitalId: {
              userId: user.id,
              hospitalId,
            },
          },
          update: {},
          create: {
            userId: user.id,
            hospitalId,
          },
        }),
      ),
    );
  }

  return user;
}

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

  const roleRecords = await db.role.findMany();
  const roleLookup = new Map(roleRecords.map((role) => [role.name, role.id]));

  const hospitalRecords = await Promise.all(
    hospitalSeeds.map((seed) =>
      db.hospital.upsert({
        where: { name: seed.name },
        update: {
          code: seed.code,
          region: seed.region,
          contactEmail: seed.contactEmail,
          contactPhone: seed.contactPhone,
          status: seed.status,
          description: seed.description,
        },
        create: {
          name: seed.name,
          code: seed.code,
          region: seed.region,
          contactEmail: seed.contactEmail,
          contactPhone: seed.contactPhone,
          status: seed.status,
          description: seed.description,
        },
      }),
    ),
  );
  const hospitalLookup = new Map(
    hospitalRecords.map((hospital) => [hospital.name, hospital.id]),
  );

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@unh.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow!123";
  const adminName = process.env.SEED_ADMIN_NAME ?? "System Administrator";
  const staffPassword = process.env.SEED_STAFF_PASSWORD ?? "ChangeMeNow!123";

  const globalAdminRoleId = roleLookup.get("GlobalAdmin");
  const hospitalAdminRoleId = roleLookup.get("HospitalAdmin");

  if (!globalAdminRoleId || !hospitalAdminRoleId) {
    throw new Error("Required roles missing; seed aborted.");
  }

  await ensureUser({
    email: adminEmail,
    name: adminName,
    password: adminPassword,
    roleIds: [globalAdminRoleId],
  });

  await Promise.all(
    hospitalAdminSeeds.map((seed) => {
      const hospitalIds =
        seed.hospitals?.map((name) => {
          const hospitalId = hospitalLookup.get(name);
          if (!hospitalId) {
            throw new Error(`Missing hospital seed for ${name}`);
          }
          return hospitalId;
        }) ?? [];

      const roleIds = seed.roles.map((roleName) => {
        const roleId = roleLookup.get(roleName);
        if (!roleId) {
          throw new Error(`Missing role seed for ${roleName}`);
        }
        return roleId;
      });

      return ensureUser({
        email: seed.email,
        name: seed.name,
        password: staffPassword,
        roleIds,
        hospitalIds,
      });
    }),
  );

  await db.systemStatus.upsert({
    where: { id: "system-status-primary" },
    update: {
      overallStatus: SystemStatusState.OPERATIONAL,
      uptimePercent: 99.982,
      lastIncidentAt: null,
      deploymentVersion:
        process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION ?? "2025.03.0",
    },
    create: {
      id: "system-status-primary",
      overallStatus: SystemStatusState.OPERATIONAL,
      uptimePercent: 99.982,
      lastIncidentAt: null,
      deploymentVersion:
        process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION ?? "2025.03.0",
    },
  });

  await Promise.all(
    onboardingSeeds.map((seed) => {
      const hospitalId = hospitalLookup.get(seed.hospital);
      if (!hospitalId) {
        throw new Error(`Missing hospital for onboarding seed ${seed.id}`);
      }

      return db.onboardingAction.upsert({
        where: { id: seed.id },
        update: {
          hospitalId,
          action: seed.action,
          owner: seed.owner,
          dueDate: seed.dueDate,
          priority: seed.priority,
          status: seed.status,
        },
        create: {
          id: seed.id,
          hospitalId,
          action: seed.action,
          owner: seed.owner,
          dueDate: seed.dueDate,
          priority: seed.priority,
          status: seed.status,
        },
      });
    }),
  );

  await Promise.all(
    activitySeeds.map((seed) =>
      db.adminActivity.upsert({
        where: { id: seed.id },
        update: {
          actor: seed.actor,
          action: seed.action,
          scope: seed.scope,
          createdAt: seed.createdAt,
          category: seed.category,
        },
        create: seed,
      }),
    ),
  );

  const settings = [
    {
      key: "maintenance_mode",
      value: { enabled: false, reason: null },
    },
    {
      key: "mfa_policy",
      value: {
        required: true,
        enforcedFor: ["GLOBAL_ADMIN", "HOSPITAL_ADMIN"],
      },
    },
    {
      key: "data_retention",
      value: { retentionDays: 365, legalHold: false },
    },
    {
      key: "compliance_settings",
      value: {
        lastReview: "2025-03-01",
        nextReview: "2025-06-01",
      },
    },
  ];

  await Promise.all(
    settings.map((setting) =>
      db.systemSetting.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          updatedBy: adminEmail,
        },
        create: {
          key: setting.key,
          value: setting.value,
          updatedBy: adminEmail,
        },
      }),
    ),
  );

  const integrationSeeds = [
    {
      id: "integration-ehr-bridge",
      name: "EHR Bridge",
      description: "Secure bridge for hospital credential sync.",
      status: IntegrationStatus.ACTIVE,
    },
    {
      id: "integration-analytics-lake",
      name: "Analytics Lake",
      description: "Exports anonymized governance metrics nightly.",
      status: IntegrationStatus.ACTIVE,
    },
  ];

  for (const integration of integrationSeeds) {
    const token = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    integrationTokens[integration.name] = token;
    await db.integrationKey.upsert({
      where: { id: integration.id },
      update: {
        name: integration.name,
        description: integration.description,
        tokenHash,
        lastFour: token.slice(-4),
        status: integration.status,
        createdBy: adminEmail,
        lastRotatedAt: new Date(),
      },
      create: {
        id: integration.id,
        name: integration.name,
        description: integration.description,
        tokenHash,
        lastFour: token.slice(-4),
        status: integration.status,
        createdBy: adminEmail,
        lastRotatedAt: new Date(),
      },
    });
  }

  await Promise.all(
    [
      {
        id: "policy-northern-sharing",
        name: "Northern Pediatric Sharing",
        description:
          "Enables emergency pediatric coordination across northern hospitals.",
        hospitalScope: hospitalRecords.map((hospital) => hospital.id),
        status: CrossAccessPolicyStatus.ACTIVE,
        approvedBy: adminEmail,
      },
    ].map((policy) =>
      db.accessPolicy.upsert({
        where: { id: policy.id },
        update: {
          name: policy.name,
          description: policy.description,
          hospitalScope: policy.hospitalScope,
          status: policy.status,
          approvedBy: policy.approvedBy,
        },
        create: policy,
      }),
    ),
  );

  await Promise.all(
    [
      {
        id: "alert-suspicious-login",
        type: "ACCESS_VIOLATION",
        severity: "high",
        description:
          "Multiple failed Global Admin logins detected from untrusted network.",
        resolved: false,
      },
    ].map((alert) =>
      db.securityAlert.upsert({
        where: { id: alert.id },
        update: alert,
        create: alert,
      }),
    ),
  );

  await Promise.all(
    [
      {
        roleName: "GlobalAdmin",
        permissions: [
          "platform:create_hospital",
          "platform:manage_admins",
          "platform:toggle_maintenance",
          "security:configure_policies",
          "analytics:view",
        ],
      },
      {
        roleName: "HospitalAdmin",
        permissions: ["hospital:assign_staff", "hospital:view_gov_reports"],
      },
    ].map((policy) =>
      db.rolePolicy.upsert({
        where: { roleName: policy.roleName },
        update: {
          permissions: policy.permissions,
        },
        create: {
          roleName: policy.roleName,
          permissions: policy.permissions,
        },
      }),
    ),
  );

  console.log(
    `Seeded roles, ${hospitalRecords.length} hospitals, and administrative datasets.`,
  );
  console.log(
    `Local admin credentials -> email: ${adminEmail}, password: ${adminPassword}`,
  );
  console.log(
    `Hospital admin credentials share the staff password: ${staffPassword}`,
  );
  Object.entries(integrationTokens).forEach(([name, token]) => {
    console.log(`Integration "${name}" token (store securely): ${token}`);
  });
}

main()
  .catch((error) => {
    console.error("Failed seeding base data", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
