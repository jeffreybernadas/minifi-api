/*
  Warnings:

  - Added the required column `visitorId` to the `LinkAnalytics` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LinkAnalytics" ADD COLUMN     "isUnique" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referrerDomain" TEXT,
ADD COLUMN     "visitorId" VARCHAR(64) NOT NULL;

-- CreateIndex
CREATE INDEX "LinkAnalytics_visitorId_idx" ON "LinkAnalytics"("visitorId");

-- CreateIndex
CREATE INDEX "LinkAnalytics_isUnique_idx" ON "LinkAnalytics"("isUnique");

-- CreateIndex
CREATE INDEX "LinkAnalytics_referrerDomain_idx" ON "LinkAnalytics"("referrerDomain");
