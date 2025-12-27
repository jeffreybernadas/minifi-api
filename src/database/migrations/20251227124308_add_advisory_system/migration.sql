-- CreateEnum
CREATE TYPE "AdvisoryType" AS ENUM ('INFO', 'WARNING', 'MAINTENANCE', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AdvisoryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Advisory" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "type" "AdvisoryType" NOT NULL DEFAULT 'INFO',
    "status" "AdvisoryStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advisory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAdvisoryDismissal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "advisoryId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAdvisoryDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Advisory_status_idx" ON "Advisory"("status");

-- CreateIndex
CREATE INDEX "Advisory_publishedAt_idx" ON "Advisory"("publishedAt");

-- CreateIndex
CREATE INDEX "Advisory_expiresAt_idx" ON "Advisory"("expiresAt");

-- CreateIndex
CREATE INDEX "UserAdvisoryDismissal_userId_idx" ON "UserAdvisoryDismissal"("userId");

-- CreateIndex
CREATE INDEX "UserAdvisoryDismissal_advisoryId_idx" ON "UserAdvisoryDismissal"("advisoryId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAdvisoryDismissal_userId_advisoryId_key" ON "UserAdvisoryDismissal"("userId", "advisoryId");

-- AddForeignKey
ALTER TABLE "UserAdvisoryDismissal" ADD CONSTRAINT "UserAdvisoryDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAdvisoryDismissal" ADD CONSTRAINT "UserAdvisoryDismissal_advisoryId_fkey" FOREIGN KEY ("advisoryId") REFERENCES "Advisory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
