-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- Add uniqueness constraints for hospital contact channels
ALTER TABLE "Hospital"
ADD CONSTRAINT "Hospital_contactEmail_key" UNIQUE ("contactEmail");

ALTER TABLE "Hospital"
ADD CONSTRAINT "Hospital_contactPhone_key" UNIQUE ("contactPhone");

-- Add metadata column to admin activity for structured context
ALTER TABLE "AdminActivity"
ADD COLUMN "metadata" JSONB;
