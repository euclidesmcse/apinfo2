import { buildVacancyPayload, renewIdempotent, validateVacancy } from "../lib/vacancy";
import { POST } from "../app/api/vacancies/route";
import { PUT, PATCH, DELETE } from "../app/api/vacancies/[id]/route";
import { describeDb, fixtures, resetDb, prisma, request } from "./db-fixtures";
describe("Vacancy validation", () => {
  it("uses a fourteen-day expiry and normalizes skills", () => {
    const now = new Date("2026-11-07T12:00:00Z");
    const data = buildVacancyPayload({ titulo: "Cloud", companyId: "c", stack: ["AWS"] }, now);
    expect(data.expiresAt.toISOString()).toBe("2026-11-21T12:00:00.000Z");
    expect(data.faixaDe).toBeNull();
  });
  it("rejects invalid salaries and currencies", () => {
    for (const faixaDe of [-1, Infinity, 1.5]) expect(() => validateVacancy({ titulo: "Cloud", companyId: "c", faixaDe })).toThrow();
    expect(() => validateVacancy({ titulo: "Cloud", companyId: "c", faixaMoeda: "INVALID" })).toThrow();
  });
  it("renewal remains idempotent when the second request arrives later that day", () => {
    const now = new Date("2026-11-07T12:00:00Z");
    const existing = { expiresAt: new Date("2026-11-21T11:00:00Z"), updatedAt: new Date("2026-11-07T11:00:00Z") };
    expect(renewIdempotent(existing, now).alreadyRenewed).toBe(true);
  });
});
describeDb("Vacancy authorization", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());
  it("rejects anonymous create and foreign mutations", async () => {
    const { candidate } = await fixtures();
    expect((await POST(request("/api/vacancies", "POST", undefined, { titulo: "X", companyId: "company-test" }))).status).toBe(401);
    for (const route of [PUT, PATCH, DELETE]) {
      const result = await route(request("/api/vacancies/vac-0", "PUT", candidate.userId, { titulo: "changed" }), { params: Promise.resolve({ id: "vac-0" }) });
      expect(result.status).toBe(403);
    }
    expect((await prisma.vacancy.findUniqueOrThrow({ where: { id: "vac-0" } })).titulo).toBe("Analista Cloud 0");
  });
  it("allows the owner and never fabricates a missing renewal", async () => {
    const { company } = await fixtures();
    const result = await PUT(request("/api/vacancies/vac-0", "PUT", company.ownerUserId!, { titulo: "Novo título" }), { params: Promise.resolve({ id: "vac-0" }) });
    expect(result.status).toBe(200);
    expect((await prisma.vacancy.findUniqueOrThrow({ where: { id: "vac-0" } })).titulo).toBe("Novo título");
    expect((await PATCH(request("/api/vacancies/missing", "PATCH", company.ownerUserId!), { params: Promise.resolve({ id: "missing" }) })).status).toBe(404);
  });
});
