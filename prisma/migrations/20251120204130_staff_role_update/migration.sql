/*
  Warnings:

  - The values [ADMINISTRATIVE] on the enum `StaffRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StaffRole_new" AS ENUM ('DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'BILLING', 'RECEPTIONIST', 'CARE_COORDINATOR', 'PHARMACIST', 'ADMINISTRATOR');
ALTER TABLE "StaffMember" ALTER COLUMN "role" TYPE "StaffRole_new" USING ("role"::text::"StaffRole_new");
ALTER TABLE "StaffAssignment" ALTER COLUMN "role" TYPE "StaffRole_new" USING ("role"::text::"StaffRole_new");
ALTER TYPE "StaffRole" RENAME TO "StaffRole_old";
ALTER TYPE "StaffRole_new" RENAME TO "StaffRole";
DROP TYPE "public"."StaffRole_old";
COMMIT;
