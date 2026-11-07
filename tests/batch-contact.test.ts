import { POST, GET } from "../app/api/contacts/batch/route";
import { proxyEvent } from "../lib/batches";
import { describeDb, fixtures, resetDb, prisma, request, mockDelivery } from "./db-fixtures";
describeDb("Company contacts and release", () => {
  beforeEach(async () => { await resetDb(); mockDelivery(); });
  afterEach(() => { jest.restoreAllMocks(); delete process.env.RESEND_API_KEY; });
  afterAll(() => prisma.$disconnect());
  it("does not trust company IDs from the body", async () => {
    const { company, candidate } = await fixtures();
    expect((await POST(request("/api/contacts/batch", "POST", candidate.userId,
      { companyId: company.id, candidateIds: [candidate.id], loteId: "a" }))).status).toBe(403);
    expect((await POST(request("/api/contacts/batch", "POST", company.ownerUserId!,
      { companyId: "another-company", candidateIds: [candidate.id], loteId: "a" }))).status).toBe(403);
  });
  it("honors per-candidate text and releases contact only after candidate reply", async () => {
    const { company, candidate } = await fixtures();
    const response = await POST(request("/api/contacts/batch", "POST", company.ownerUserId!,
      { candidateIds: [candidate.id], loteId: "a", perCandidate: { [candidate.id]: { subject: "Assunto pessoal", body: "Convite individual" } } }));
    expect(response.status).toBe(201);
    expect((await prisma.mailOutbox.findFirst())?.body).toBe("Convite individual");
    const app = await prisma.application.findFirstOrThrow();
    let listing = await (await GET(request("/api/contacts/batch", "GET", company.ownerUserId!))).json();
    expect(listing.applications[0].candidate.email).toBeUndefined();
    await expect(proxyEvent({ proxyThreadId: app.proxyThreadId, event: "respondido", senderEmail: company.email })).rejects.toMatchObject({ status: 403 });
    await proxyEvent({ proxyThreadId: app.proxyThreadId, event: "respondido", senderEmail: candidate.email });
    await proxyEvent({ proxyThreadId: app.proxyThreadId, event: "respondido", senderEmail: candidate.email });
    expect(await prisma.consentLog.count()).toBe(1);
    listing = await (await GET(request("/api/contacts/batch", "GET", company.ownerUserId!))).json();
    expect(listing.applications[0].candidate.email).toBe(candidate.email);
    expect((await GET(request("/api/contacts/batch", "GET", "outsider"))).status).toBe(403);
  });
});
