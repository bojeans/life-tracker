-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('PHOTO', 'VIDEO');

-- CreateTable
CREATE TABLE "MediaItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL DEFAULT 'PHOTO',
    "storageKey" TEXT NOT NULL,
    "thumbKey" TEXT,
    "title" TEXT,
    "album" TEXT,
    "takenAt" TIMESTAMP(3),
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaItem_userId_takenAt_id_idx" ON "MediaItem"("userId", "takenAt", "id");

-- AddForeignKey
ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
