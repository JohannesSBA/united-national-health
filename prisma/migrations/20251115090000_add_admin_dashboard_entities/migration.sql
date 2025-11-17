-- CreateEnum
CREATE TYPE "OnboardingPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SystemStatusState" AS ENUM ('OPERATIONAL', 'DEGRADED', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "OnboardingAction" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" "OnboardingPriority" NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActivity" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemStatus" (
    "id" TEXT NOT NULL,
    "overallStatus" "SystemStatusState" NOT NULL,
    "uptimePercent" DOUBLE PRECISION NOT NULL,
    "lastIncidentAt" TIMESTAMP(3),
    "deploymentVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnboardingAction_hospitalId_idx" ON "OnboardingAction"("hospitalId");

-- CreateIndex
CREATE INDEX "OnboardingAction_status_idx" ON "OnboardingAction"("status");

-- AddForeignKey
ALTER TABLE "OnboardingAction" ADD CONSTRAINT "OnboardingAction_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

