-- CreateTable
CREATE TABLE "BloodPressureEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "systolic" INTEGER NOT NULL,
    "diastolic" INTEGER NOT NULL,
    "pulse" INTEGER,
    "note" TEXT,
    "source" "HealthSource" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BloodPressureEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BloodPressureEntry_userId_date_idx" ON "BloodPressureEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BloodPressureEntry_userId_source_externalId_key" ON "BloodPressureEntry"("userId", "source", "externalId");

-- AddForeignKey
ALTER TABLE "BloodPressureEntry" ADD CONSTRAINT "BloodPressureEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
