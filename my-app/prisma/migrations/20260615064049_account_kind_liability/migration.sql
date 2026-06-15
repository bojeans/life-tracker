-- CreateEnum
CREATE TYPE "AccountKind" AS ENUM ('ASSET', 'LIABILITY');

-- AlterTable
ALTER TABLE "WealthAccount" ADD COLUMN     "kind" "AccountKind" NOT NULL DEFAULT 'ASSET';
