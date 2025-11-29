/*
  Warnings:

  - You are about to drop the column `securityScore` on the `Link` table. All the data in the column will be lost.
  - You are about to drop the column `securityStatus` on the `Link` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'SAFE', 'SUSPICIOUS', 'MALICIOUS', 'ADULT_CONTENT');

-- AlterTable
ALTER TABLE "Link" DROP COLUMN "securityScore",
DROP COLUMN "securityStatus",
ADD COLUMN     "lastScanVersion" VARCHAR(50),
ADD COLUMN     "scanDetails" JSONB,
ADD COLUMN     "scanScore" DOUBLE PRECISION,
ADD COLUMN     "scanStatus" "ScanStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "SecurityStatus";
