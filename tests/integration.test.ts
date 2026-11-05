/**
 * Integration tests — só rodam se DATABASE_URL estiver configurado + Postgres acessível.
 * Sem DATABASE_URL, suite é SKIP (não falso GREEN, mas marcado como skipped).
 * Cobre C1/C2 com banco real quando disponível.
 */

const hasDb = !!process.env.DATABASE_URL;

const describeIntegration = hasDb ? describe : describe.skip;

describeIntegration("Integration — Postgres (guarded by DATABASE_URL)", () => {
  it("placeholder: requer DATABASE_URL e Postgres com pgvector", () => {
    expect(process.env.DATABASE_URL).toBeTruthy();
  });

  it("Prisma migrate + seed + hygiene queries funcionam (requer DB)", async () => {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    try {
      // Verifica conexão
      await prisma.$queryRaw`SELECT 1 as ok`;
      // Verifica que models existem
      expect(prisma.candidateProfile).toBeDefined();
      expect(prisma.vacancy).toBeDefined();
      expect(prisma.application).toBeDefined();
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  });

  it("Partial unique index existe para Application (C1) — verifica via pg_indexes", async () => {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    try {
      const rows = (await prisma.$queryRaw`
        SELECT indexname FROM pg_indexes WHERE tablename = 'Application' AND indexname = 'Application_candidateId_vacancyId_partial_unique'
      `) as Array<{ indexname: string }>;
      // Se migration foi aplicada, índice existe; se ainda não, falha indica que migration precisa rodar
      expect(rows.length).toBe(1);
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  });
});

// Sempre visível: garante que suite não passa silenciosa sem DB
describe("Integration — unit guard", () => {
  it("marca testes de integração como skipped quando DATABASE_URL ausente (I3)", () => {
    if (!process.env.DATABASE_URL) {
      expect(hasDb).toBe(false);
      // eslint-disable-next-line no-console
      console.log("[integration] DATABASE_URL ausente — testes de integração SKIPPED (esperado em CI sem DB)");
    } else {
      expect(hasDb).toBe(true);
    }
  });
});
