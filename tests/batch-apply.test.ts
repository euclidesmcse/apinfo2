import { POST, GET, PATCH } from "../app/api/applications/batch/route";
import { createBatch } from "../lib/batches";
import { describeDb, fixtures, resetDb, prisma, request, mockDelivery } from "./db-fixtures";
describeDb("Persistent applications", () => {
  beforeEach(async () => { await resetDb(); mockDelivery(); });
  afterEach(() => { jest.restoreAllMocks(); delete process.env.RESEND_API_KEY; });
  afterAll(() => prisma.$disconnect());
  it("rejects impersonation without authentication", async () => {
    const response = await POST(request("/api/applications/batch", "POST", undefined, { candidateId: "victim", vacancyIds: ["vac-0"] }));
    expect(response.status).toBe(401);
    expect(await prisma.application.count()).toBe(0);
  });
  it("uses profile ID rather than phone, survives reads, and retries are idempotent", async () => {
    const { candidate } = await fixtures();
    const body = { vacancyIds: ["vac-0", "vac-1"], loteId: "batch-a", candidateId: "victim" };
    const result = await POST(request("/api/applications/batch", "POST", candidate.userId, body));
    expect(result.status).toBe(201);
    expect((await result.json()).results.every((r: any) => r.status === "enviado")).toBe(true);
    await POST(request("/api/applications/batch", "POST", candidate.userId, body));
    expect(await prisma.application.count()).toBe(2);
    expect(await prisma.mailOutbox.count({ where: { status: "sent" } })).toBe(2);
    expect((await prisma.dailyUsage.findFirst())?.count).toBe(2);
    const own = await GET(request("/api/applications/batch?candidateId=victim", "GET", candidate.userId));
    expect((await own.json()).applications).toHaveLength(2);
    const foreign = await GET(request("/api/applications/batch?candidateId=" + candidate.id, "GET", "another-user"));
    expect((await foreign.json()).applications).toHaveLength(0);
  });
  it("partial failure does not undo successful applications or count expired items", async () => {
    const { candidate } = await fixtures();
    await prisma.vacancy.update({ where: { id: "vac-1" }, data: { expiresAt: new Date(0) } });
    const response = await POST(request("/api/applications/batch", "POST", candidate.userId, { vacancyIds: ["vac-0", "vac-1"], loteId: "b" }));
    expect(response.status).toBe(207);
    expect(await prisma.application.count()).toBe(1);
    expect((await prisma.dailyUsage.findFirst())?.count).toBe(1);
  });
  it("provider errors remain pending and a missing provider creates nothing", async () => {
    const { candidate } = await fixtures();
    (fetch as jest.Mock).mockRejectedValue(new Error("timeout"));
    const response = await POST(request("/api/applications/batch", "POST", candidate.userId, { vacancyIds: ["vac-0"], loteId: "b" }));
    expect((await response.json()).results[0].status).toBe("pendente");
    delete process.env.RESEND_API_KEY;
    expect((await POST(request("/api/applications/batch", "POST", candidate.userId, { vacancyIds: ["vac-1"], loteId: "c" }))).status).toBe(503);
    expect(await prisma.application.count()).toBe(1);
  });
  it("serializes concurrent daily-limit checks", async () => {
    const { candidate } = await fixtures(32);
    await prisma.dailyUsage.create({ data: { actorId: "apply:" + candidate.id, day: new Date().toISOString().slice(0,10), count: 29 } });
    const results = await Promise.all([0, 1, 2].map(i => createBatch("apply", candidate.id, ["vac-" + i], { loteId: "parallel-" + i })));
    expect(results.flat().filter(r => r.status === "enviado")).toHaveLength(1);
    expect(results.flat().filter(r => r.code === 429)).toHaveLength(2);
    expect((await prisma.dailyUsage.findFirst())?.count).toBe(30);
  });
  it("requires a service secret for status webhooks", async () => {
    expect((await PATCH(request("/api/applications/batch", "PATCH", undefined, { proxyThreadId: "t", event: "respondido" }))).status).toBe(401);
  });
});
