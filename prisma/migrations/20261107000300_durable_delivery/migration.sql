ALTER TABLE "Application" ALTER COLUMN status SET DEFAULT 'pendente';
CREATE TABLE "DailyUsage" ("actorId" TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY ("actorId", day));
CREATE TABLE "MailOutbox" (
  id TEXT PRIMARY KEY, "applicationId" TEXT REFERENCES "Application"(id) ON DELETE CASCADE,
  "dedupeKey" TEXT NOT NULL UNIQUE, "to" TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, "replyTo" TEXT,
  status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, "providerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lockedAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3)
);
CREATE INDEX "MailOutbox_status_createdAt_idx" ON "MailOutbox"(status, "createdAt");
