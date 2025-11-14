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
  for (const name of roles) {
    await db.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

main()
  .catch((error) => {
    console.error("Failed seeding base roles", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
