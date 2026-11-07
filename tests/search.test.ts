import { searchCandidates, searchVacancies, suggestCorrection } from "../lib/search";
import { publicCandidate } from "../lib/public-candidate";
import { describeDb, fixtures, resetDb, prisma } from "./db-fixtures";
describe("Public search serialization", () => {
  it("uses an allowlist, including for nested and future fields", () => {
    const dto = publicCandidate({ id: "p", userId: "+5511999999999", nome: "Ana", email: "private@test", celular: "secret",
      contato: { email: "nested" }, links: ["private"], futureSecret: "secret" });
    expect(dto).toEqual({ id: "p", nome: "Ana" });
  });
  it("suggests spelling correction", () => expect(suggestCorrection("Analsita Cluod")).toBe("Analista Cloud"));
});
describeDb("Database search", () => {
  beforeEach(async () => { await resetDb(); delete process.env.DEMO_MODE; });
  afterAll(() => prisma.$disconnect());
  it("filters before pagination and counts all matching rows", async () => {
    await fixtures(45);
    const first = await searchVacancies({ q: "Cloud", page: 1 });
    const second = await searchVacancies({ q: "Cloud", page: 2 });
    const third = await searchVacancies({ q: "Cloud", page: 3 });
    expect(first.total).toBe(45);
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(20);
    expect(third.items).toHaveLength(5);
    expect(new Set([...first.items, ...second.items, ...third.items].map(x => x.id)).size).toBe(45);
    expect((await searchVacancies({ regime: "CLT" })).total).toBe(23);
    expect((await searchVacancies({ q: "' OR 1=1 --" })).total).toBe(0);
  });
  it("does not replace empty results with demo records and excludes expired entries", async () => {
    expect((await searchVacancies({})).total).toBe(0);
    await fixtures();
    await prisma.vacancy.updateMany({ data: { expiresAt: new Date(0) } });
    expect((await searchVacancies({})).total).toBe(0);
    const result = await searchCandidates({});
    expect(result.total).toBe(1);
    expect(JSON.stringify(result)).not.toMatch(/private@example|5511999999999|userId|celular/);
  });
  it("propagates database failures instead of returning fake empty success", async () => {
    const mock = jest.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("DB offline"));
    await expect(searchVacancies({})).rejects.toThrow("DB offline");
    mock.mockRestore();
  });
});
