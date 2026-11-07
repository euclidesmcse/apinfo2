import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { ApiError, textField } from "./api";
import { assertMailConfigured, deliverMail } from "./mail";
export const BATCH_LIMIT = 10, DAILY_LIMIT = 30;
export function batchIds(value: unknown): string[] {
  if (!Array.isArray(value) || !value.length || value.length > BATCH_LIMIT ||
      value.some(id => typeof id !== "string" || !id.trim() || id.length > 100)) throw new ApiError("Selecione de 1 a 10 itens", 400);
  return [...new Set(value.map(id => id.trim()))];
}
export async function createBatch(kind: "apply" | "contact", actorId: string, ids: string[], body: Record<string, any>) {
  assertMailConfigured();
  const loteId = textField(body.loteId, "Lote", 100, true);
  const results: any[] = [];
  for (const id of ids) {
    try {
      const app = await prisma.$transaction(async tx => {
        const now = new Date(), day = now.toISOString().slice(0, 10), key = kind + ":" + actorId;
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${key + ":" + day}))`;
        const vacancy = kind === "apply" ? await tx.vacancy.findUnique({ where: { id } }) : null;
        if (kind === "apply" && (!vacancy || vacancy.status !== "ativa" || vacancy.expiresAt <= now)) throw new ApiError("Vaga ausente ou expirada", 410);
        const candidate = await tx.candidateProfile.findUnique({ where: { id: kind === "apply" ? actorId : id } });
        if (!candidate || candidate.status !== "ativo" || candidate.expiresAt <= now || !candidate.tratamentoBuscaV || !candidate.contatoProxyV)
          throw new ApiError("Perfil ausente, expirado ou sem consentimento", 410);
        const company = await tx.companyProfile.findUnique({ where: { id: vacancy?.companyId ?? actorId } });
        if (!company || company.validacaoStatus === "rejeitado" || !company.email) throw new ApiError("Empresa indisponível para contato", 409);
        const existing = await tx.application.findFirst({ where: { candidateId: candidate.id,
          vacancyId: vacancy?.id ?? null, companyId: company.id, ...(kind === "contact" ? { loteId } : {}) } });
        if (existing) {
          if (existing.loteId === loteId) return existing;
          throw new ApiError("Já se candidatou a esta vaga", 409);
        }
        const usage = await tx.dailyUsage.findUnique({ where: { actorId_day: { actorId: key, day } } });
        if ((usage?.count ?? 0) >= DAILY_LIMIT) throw new ApiError("Limite diário de 30 envios atingido", 429);
        const created = await tx.application.create({ data: {
          candidateId: candidate.id, companyId: company.id, vacancyId: vacancy?.id ?? null,
          origem: kind === "apply" ? "candidaturaLote" : "contatoLote", status: "pendente", loteId,
          proxyThreadId: "thr_" + randomUUID(),
        } });
        const override = body.perCandidate?.[candidate.id] ?? {};
        const subject = textField(override.subject ?? body.subject, "Assunto", 200) ||
          (kind === "apply" ? "Candidatura: " + vacancy!.titulo : "Contato de " + company.nome);
        const message = textField(override.body ?? body.body, "Mensagem", 5000) ||
          (kind === "apply" ? candidate.nome + " se candidatou à vaga " + vacancy!.titulo + "." :
            "Olá, " + candidate.nome + ". Gostaríamos de conversar sobre uma oportunidade. Responda para liberar seu contato direto à empresa.");
        await tx.mailOutbox.create({ data: { applicationId: created.id, dedupeKey: created.id,
          to: kind === "apply" ? company.email : candidate.email, subject, body: message,
          replyTo: created.proxyThreadId + "@" + process.env.PROXY_DOMAIN } });
        await tx.dailyUsage.upsert({ where: { actorId_day: { actorId: key, day } },
          create: { actorId: key, day, count: 1 }, update: { count: { increment: 1 } } });
        if (vacancy) await tx.vacancy.update({ where: { id: vacancy.id }, data: { candidaturasCount: { increment: 1 } } });
        return created;
      });
      const mail = await prisma.mailOutbox.findUnique({ where: { dedupeKey: app.id } });
      if (mail) await deliverMail(mail.id);
      const saved = await prisma.application.findUniqueOrThrow({ where: { id: app.id } });
      results.push({ id: saved.id, applicationId: saved.id, candidateId: saved.candidateId, vacancyId: saved.vacancyId,
        proxyThreadId: saved.proxyThreadId, status: saved.status });
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      results.push({ [kind === "apply" ? "vacancyId" : "candidateId"]: id, status: "error", code: error.status, error: error.message });
    }
  }
  return results;
}
export async function proxyEvent(body: Record<string, any>) {
  const thread = textField(body.proxyThreadId, "Thread", 100, true);
  if (!["visualizado", "respondido"].includes(body.event)) throw new ApiError("Evento inválido", 400);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Application" WHERE "proxyThreadId" = ${thread} FOR UPDATE`;
    const app = await tx.application.findUnique({ where: { proxyThreadId: thread }, include: { candidate: true } });
    if (!app) throw new ApiError("Contato não encontrado", 404);
    if (["pendente", "falha", "arquivado"].includes(app.status)) throw new ApiError("Transição inválida", 409);
    // The trusted mail adapter must authenticate the sender before issuing this event.
    if (body.event === "respondido" && body.senderEmail?.toLowerCase() !== app.candidate.email.toLowerCase())
      throw new ApiError("A liberação exige resposta do próprio candidato", 403);
    if (app.status === "respondido") return { id: app.id, status: app.status };
    await tx.application.update({ where: { id: app.id }, data: { status: body.event } });
    if (body.event === "respondido") await tx.consentLog.create({ data: {
      userId: app.candidate.userId, tipo: "contatoProxy", versao: 1, baseLegal: "consentimento",
      texto: "Contato liberado por resposta autenticada na conversa " + thread,
    } });
    return { id: app.id, status: body.event };
  });
}
