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
  console.log(`Successfully seeded ${roles.length} roles`);
}

main()
  .catch((error) => {
    console.error("Failed seeding base roles", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
