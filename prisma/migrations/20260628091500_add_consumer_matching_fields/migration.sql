DO $$
BEGIN
  CREATE TYPE "StorageType" AS ENUM ('AMBIENT', 'CHILLED', 'FROZEN', 'MIXED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "Weekday" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "maxCapacityKg" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "currentLoadKg" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "acceptsPreparedMeals" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "acceptsBreadCereal" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "acceptsVegetables" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "acceptsFruits" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "acceptsDairy" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "acceptsDryGoods" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "acceptsOther" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "storageType" "StorageType",
  ADD COLUMN IF NOT EXISTS "serviceRadiusKm" DOUBLE PRECISION DEFAULT 20,
  ADD COLUMN IF NOT EXISTS "autoAcceptMatch" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "matchingEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "ConsumerOperatingHour" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "weekday" "Weekday" NOT NULL,
  "openTime" TEXT NOT NULL,
  "closeTime" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConsumerOperatingHour_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConsumerOperatingHour_profileId_fkey"
    FOREIGN KEY ("profileId")
    REFERENCES "Profile"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConsumerOperatingHour_profileId_weekday_key"
  ON "ConsumerOperatingHour"("profileId", "weekday");

CREATE INDEX IF NOT EXISTS "ConsumerOperatingHour_profileId_weekday_isActive_idx"
  ON "ConsumerOperatingHour"("profileId", "weekday", "isActive");
