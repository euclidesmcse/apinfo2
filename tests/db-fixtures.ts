import { prisma } from "../lib/prisma";
import { signJwt } from "../lib/auth";
export { prisma };
export const describeDb = process.env.DATABASE_URL ? describe : describe.skip;
export async function resetDb() {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith("_test")) throw new Error("Tests require a dedicated database ending in _test");
  await prisma.mailOutbox.deleteMany();
  await prisma.application.deleteMany();
  await prisma.consentLog.deleteMany();
  await prisma.candidateProfile.deleteMany();
  await prisma.vacancy.deleteMany();
  await prisma.companyProfile.deleteMany();
  await prisma.dailyUsage.deleteMany();
  await prisma.hygieneEvent.deleteMany();
}
export async function fixtures(count = 3) {
  const company = await prisma.companyProfile.create({ data: { id: "company-test", nome: "Empresa", ownerUserId: "+5511888888888", email: "rh@example.test" } });
  const candidate = await prisma.candidateProfile.create({ data: { id: "profile-test", userId: "+5511999999999", nome: "Ana", titulo: "Analista Cloud",
    objetivoCrescimento: "Crescer como analista", celular: "+5511999999999", email: "private@example.test", expiresAt: new Date(Date.now() + 180 * 86400000),
    stack: [{ skillId: "aws" }] } });
  await prisma.vacancy.createMany({ data: Array.from({ length: count }, (_, i) => ({
    id: "vac-" + i, companyId: company.id, titulo: "Analista Cloud " + i, regime: i % 2 ? "PJ" : "CLT",
    expiresAt: new Date(Date.now() + 14 * 86400000),
  })) });
  return { company, candidate };
}
export function request(path: string, method: string, userId?: string, body?: any) {
  return new Request("http://localhost" + path, { method, headers: {
    "content-type": "application/json", ...(userId ? { authorization: "Bearer " + signJwt({ userId }) } : {}),
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
export function mockDelivery() {
  process.env.RESEND_API_KEY = "test-api-key";
  process.env.EMAIL_FROM = "app@example.test";
  process.env.PROXY_DOMAIN = "via.example.test";
  process.env.WEBHOOK_SECRET = "test-only-isolated-webhook-secret-at-least-32";
  return jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "provider-id" }), { status: 200 }));
}
