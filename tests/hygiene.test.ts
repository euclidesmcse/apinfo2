import { runPersistentHygiene } from "../lib/hygiene-db";
import { describeDb, fixtures, resetDb, prisma, mockDelivery } from "./db-fixtures";
describeDb("Persistent hygiene", () => {
  beforeEach(async () => { await resetDb(); mockDelivery(); });
  afterEach(() => { jest.restoreAllMocks(); delete process.env.RESEND_API_KEY; });
  afterAll(() => prisma.$disconnect());
  it("deduplicates nudges across runs and respects opt-out", async () => {
    const { candidate } = await fixtures();
    const now = new Date();
    await prisma.candidateProfile.update({ where: { id: candidate.id }, data: { expiresAt: new Date(now.getTime() + 4 * 86400000) } });
    await runPersistentHygiene(now);
    await runPersistentHygiene(new Date(now.getTime() + 3600000));
    expect(await prisma.mailOutbox.count()).toBe(1);
    await prisma.mailOutbox.deleteMany();
    await prisma.candidateProfile.update({ where: { id: candidate.id }, data: { nudgesV: 0 } });
    await runPersistentHygiene(now);
    expect(await prisma.mailOutbox.count()).toBe(0);
  });
  it("archives expired candidates and vacancies even without mail configuration, then purges after 30 days", async () => {
    const { candidate } = await fixtures();
    delete process.env.RESEND_API_KEY;
    const now = new Date();
    await prisma.candidateProfile.update({ where: { id: candidate.id }, data: { expiresAt: now } });
    await prisma.vacancy.updateMany({ data: { expiresAt: now } });
    let summary = await runPersistentHygiene(now);
    expect(summary.candidatesArchived).toBe(1);
    expect(summary.vacanciesArchived).toBe(3);
    summary = await runPersistentHygiene(new Date(now.getTime() + 31 * 86400000));
    expect(summary.candidatesPurged).toBe(1);
    expect(summary.vacanciesPurged).toBe(3);
    expect(await prisma.candidateProfile.count()).toBe(0);
  });
});
