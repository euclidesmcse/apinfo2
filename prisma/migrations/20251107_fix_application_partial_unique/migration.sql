-- Fix C1: Postgres NULL != NULL — @@unique([candidateId, vacancyId]) com vacancyId nullable permite duplicatas
-- Partial unique index: só aplica unicidade quando vacancyId IS NOT NULL
-- vacancyId NULL = Contact sem vaga (sem dedupe por vaga); vacancyId NOT NULL = deduplica por par
CREATE UNIQUE INDEX IF NOT EXISTS "Application_candidateId_vacancyId_partial_unique"
  ON "Application" ("candidateId", "vacancyId")
  WHERE "vacancyId" IS NOT NULL;
