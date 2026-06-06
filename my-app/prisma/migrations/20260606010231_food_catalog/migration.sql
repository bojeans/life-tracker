-- AlterTable
ALTER TABLE "DietEntry" ADD COLUMN     "foodItemId" TEXT;

-- CreateTable
CREATE TABLE "FoodItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "barcode" TEXT,
    "servingSizeG" DECIMAL(10,2),
    "calories" DECIMAL(10,2) NOT NULL,
    "protein" DECIMAL(10,2) NOT NULL,
    "carbs" DECIMAL(10,2) NOT NULL,
    "fat" DECIMAL(10,2) NOT NULL,
    "fiber" DECIMAL(10,2),
    "sugar" DECIMAL(10,2),
    "sodium" DECIMAL(10,2),
    "satFat" DECIMAL(10,2),
    "source" "HealthSource" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FoodItem_userId_name_idx" ON "FoodItem"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "FoodItem_userId_barcode_key" ON "FoodItem"("userId", "barcode");

-- AddForeignKey
ALTER TABLE "DietEntry" ADD CONSTRAINT "DietEntry_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodItem" ADD CONSTRAINT "FoodItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
