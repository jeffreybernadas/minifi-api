-- CreateIndex
CREATE INDEX "Advisory_status_publishedAt_expiresAt_idx" ON "Advisory"("status", "publishedAt", "expiresAt");
