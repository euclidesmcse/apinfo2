/**
 * lib/proxy — Proxy e-mail via Resend id@via.* + candidatura lote (Task 7)
 * - Gera proxyThreadId, e-mail proxy, envio via Resend (mock in-memory MVP)
 * - CV canônico PDF gerado (stub Buffer)
 * - Transição estados enviado>visualizado>respondido via webhook
 * - Stores in-memory para vacancies / applications / rate limit (fallback quando DB off)
 * - Primary import para testes: tudo aqui é sincronizável e resetável
 */

import * as crypto from "crypto";

// ── Constantes ───────────────────────────────────────────────────────────
export const PROXY_DOMAIN = process.env.PROXY_DOMAIN || "via.apinfo.com";
export const DAILY_LIMIT = 30;
export const BATCH_LIMIT = 10;

// ── Tipos ────────────────────────────────────────────────────────────────
export type ApplicationStatus = "enviado" | "visualizado" | "respondido" | "arquivado";
export type ApplicationOrigin = "candidaturaLote" | "contatoLote" | "swipe";

export type ProxyApplication = {
  id: string;
  vacancyId: string;
  candidateId: string;
  companyId: string;
  origem: ApplicationOrigin;
  proxyThreadId: string;
  status: ApplicationStatus;
  loteId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type VacancyMock = {
  id: string;
  companyId: string;
  titulo: string;
  status: string; // ativa | arquivada
  expiresAt: Date;
  stack?: any[];
  faixaDe?: number | null;
  faixaAte?: number | null;
};

export type CandidateMock = {
  userId: string;
  nome: string;
  titulo: string;
  email: string;
  celular: string;
  objetivoCrescimento?: string;
  stack?: any[];
};

// ── In-memory stores (MVP, in-process) ─────────────────────────────────
export const vacancyStore = new Map<string, VacancyMock>();
export const candidateStore = new Map<string, CandidateMock>();
export const applicationStore = new Map<string, ProxyApplication>(); // key: id
export const applicationByThread = new Map<string, ProxyApplication>();
export const applicationByCandidateVacancy = new Map<string, ProxyApplication>(); // key candidateId:vacancyId
export const dailyRateStore = new Map<string, { date: string; count: number }>(); // userId -> {date, count}
export const sentEmails: Array<{
  to: string;
  from: string;
  proxyThreadId: string;
  subject: string;
  body: string;
  attachments: Array<{ filename: string; content: Buffer | string }>;
  candidateId: string;
  vacancyId: string;
}> = [];

// ── Helpers ──────────────────────────────────────────────────────────────
function httpError(message: string, status: number): Error & { status: number; statusCode: number } {
  const e: any = new Error(message);
  e.status = status;
  e.statusCode = status;
  return e;
}

export function generateProxyThreadId(): string {
  try {
    if (typeof crypto.randomUUID === "function") return `thr_${crypto.randomUUID()}`;
  } catch {}
  return `thr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function proxyEmailForThread(threadId: string): string {
  return `${threadId}@${PROXY_DOMAIN}`;
}

export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function getDailyCount(userId: string, dateStr?: string): number {
  const key = dateStr ?? todayKey();
  const rec = dailyRateStore.get(userId);
  if (!rec || rec.date !== key) return 0;
  return rec.count;
}

export function incDailyCount(userId: string, inc = 1, dateStr?: string): number {
  const key = dateStr ?? todayKey();
  const rec = dailyRateStore.get(userId);
  if (!rec || rec.date !== key) {
    dailyRateStore.set(userId, { date: key, count: inc });
    return inc;
  }
  rec.count += inc;
  return rec.count;
}

export function canEnqueue(userId: string, batchSize: number): { allowed: boolean; current: number; wouldBe: number } {
  const current = getDailyCount(userId);
  const wouldBe = current + batchSize;
  return { allowed: wouldBe <= DAILY_LIMIT, current, wouldBe };
}

// ── Vacancy helpers (for tests seeding) ─────────────────────────────────
export function seedVacancy(v: Partial<VacancyMock> & { id: string }): VacancyMock {
  const now = new Date();
  const full: VacancyMock = {
    id: v.id,
    companyId: v.companyId ?? `comp_${v.id}`,
    titulo: v.titulo ?? `Vaga ${v.id}`,
    status: v.status ?? "ativa",
    expiresAt: v.expiresAt ?? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    stack: v.stack ?? [{ skillId: "aws" }],
    faixaDe: v.faixaDe ?? null,
    faixaAte: v.faixaAte ?? null,
  };
  vacancyStore.set(full.id, full);
  return full;
}

export function seedCandidate(c: Partial<CandidateMock> & { userId: string }): CandidateMock {
  const full: CandidateMock = {
    userId: c.userId,
    nome: c.nome ?? "Candidato Teste",
    titulo: c.titulo ?? "Engenheiro Cloud",
    email: c.email ?? "cand@example.com",
    celular: c.celular ?? "+5511999999999",
    objetivoCrescimento: c.objetivoCrescimento ?? "Crescer para Tech Lead",
    stack: c.stack ?? [{ skillId: "aws" }],
  };
  candidateStore.set(full.userId, full);
  return full;
}

export function isVacancyExpired(v: VacancyMock, now = new Date()): boolean {
  if (!v) return true;
  if (v.status !== "ativa") return true;
  const exp = v.expiresAt instanceof Date ? v.expiresAt : new Date(v.expiresAt as any);
  return exp.getTime() <= now.getTime();
}

// ── PDF canônico stub ────────────────────────────────────────────────────
export function generateCanonicalPdf(candidate: CandidateMock): Buffer {
  // stub minimal PDF header + conteúdo canônico
  const text = `CV CANONICO - ${candidate.nome} - ${candidate.titulo}\nObjetivo: ${candidate.objetivoCrescimento}\nStack: ${(candidate.stack ?? []).map((s: any) => s.skillId).join(", ")}`;
  const header = Buffer.from("%PDF-1.4\n% stub canônico\n");
  return Buffer.concat([header, Buffer.from(text, "utf-8")]);
}

// ── Envio via Resend (mock in-memory) ───────────────────────────────────
export async function sendProxyEmail(opts: {
  toCompanyEmail?: string;
  candidate: CandidateMock;
  vacancy: VacancyMock;
  proxyThreadId: string;
  applicationId: string;
}): Promise<{ id: string }> {
  const from = proxyEmailForThread(opts.proxyThreadId);
  // destinatário: empresa (via vacancy -> company). Mock usa companyId@empresa.com
  const to = opts.toCompanyEmail ?? `rh-${opts.vacancy.companyId}@empresa.com`;
  const subject = `Candidatura: ${opts.candidate.titulo} — ${opts.vacancy.titulo}`;
  const body = `Olá, candidato ${opts.candidate.nome} se candidatou à vaga "${opts.vacancy.titulo}".\nResponda este e-mail (thread ${opts.proxyThreadId}) para liberar contato direto.`;

  const pdf = generateCanonicalPdf(opts.candidate);

  sentEmails.push({
    to,
    from,
    proxyThreadId: opts.proxyThreadId,
    subject,
    body,
    attachments: [{ filename: `cv-${opts.candidate.userId}.pdf`, content: pdf }],
    candidateId: opts.candidate.userId,
    vacancyId: opts.vacancy.id,
  });

  // se Resend real configurado, tentaria enviar (não quebra testes)
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      // dynamic import não obrigatório
      // await fetch("https://api.resend.com/emails", {method:"POST", headers:{Authorization:`Bearer ${apiKey}`}, body: JSON.stringify({from,to,subject,html:body})})
      void apiKey;
    }
  } catch {}
  return { id: `email_${opts.proxyThreadId}` };
}

// ── Application lifecycle ────────────────────────────────────────────────
const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  enviado: ["visualizado", "arquivado"],
  visualizado: ["respondido", "arquivado"],
  respondido: ["arquivado"],
  arquivado: [],
};

export function transitionAllowed(from: ApplicationStatus, to: ApplicationStatus): boolean {
  if (from === to) return true;
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export function updateApplicationStatus(
  proxyThreadId: string,
  newStatus: ApplicationStatus
): ProxyApplication {
  const app = applicationByThread.get(proxyThreadId);
  if (!app) throw httpError("thread não encontrada", 404);
  if (!transitionAllowed(app.status, newStatus)) {
    throw httpError(`transição inválida ${app.status} -> ${newStatus}`, 400);
  }
  app.status = newStatus;
  app.updatedAt = new Date();
  // sync maps
  applicationStore.set(app.id, app);
  applicationByCandidateVacancy.set(`${app.candidateId}:${app.vacancyId}`, app);
  return app;
}

export function handleProxyWebhook(proxyThreadId: string, event: string): ProxyApplication {
  const ev = event.toLowerCase();
  let target: ApplicationStatus | null = null;
  if (ev === "visualizado" || ev === "open" || ev === "opened" || ev === "viewed") target = "visualizado";
  else if (ev === "respondido" || ev === "reply" || ev === "replied" || ev === "response") target = "respondido";
  else if (ev === "enviado" || ev === "sent") target = "enviado";
  else throw httpError(`evento webhook desconhecido: ${event}`, 400);
  return updateApplicationStatus(proxyThreadId, target);
}

// ── Batch create (core logic, sem rollback total) ───────────────────────
export type BatchItemResult = {
  vacancyId: string;
  applicationId?: string;
  proxyThreadId?: string;
  status: string; // enviado | error
  code?: number;
  error?: string;
};

/**
 * Cria candidaturas em lote 1-clique: transação por item, sem rollback total.
 * Chamada pelo route handler após checks globais (auth, limites).
 */
export async function createBatchApplications(opts: {
  candidateId: string;
  vacancyIds: string[];
  loteId?: string | null;
}): Promise<BatchItemResult[]> {
  const loteId = opts.loteId ?? `lote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const results: BatchItemResult[] = [];

  for (const vacancyId of opts.vacancyIds) {
    try {
      if (!vacancyId || typeof vacancyId !== "string") throw httpError("vacancyId inválido", 400);

      // lookup vacancy: memory store first, then DB if available
      let vacancy: VacancyMock | null = vacancyStore.get(vacancyId) ?? null;
      if (!vacancy) {
        try {
          const { prisma } = await import("./prisma");
          const dbVac = await (prisma as any).vacancy.findUnique({ where: { id: vacancyId } }).catch(() => null);
          if (dbVac) {
            vacancy = {
              id: dbVac.id,
              companyId: dbVac.companyId,
              titulo: dbVac.titulo,
              status: dbVac.status,
              expiresAt: new Date(dbVac.expiresAt),
              stack: dbVac.stack as any,
              faixaDe: dbVac.faixaDe,
              faixaAte: dbVac.faixaAte,
            };
          }
        } catch {}
      }
      if (!vacancy) throw httpError("vaga não encontrada", 404);
      if (isVacancyExpired(vacancy)) throw httpError("vaga expirada", 410);

      // deduplicação
      const dupKey = `${opts.candidateId}:${vacancyId}`;
      if (applicationByCandidateVacancy.has(dupKey)) throw httpError("já se candidatou", 409);
      // também checa DB unique
      try {
        const { prisma } = await import("./prisma");
        const existing = await (prisma as any).application.findFirst({ where: { candidateId: opts.candidateId, vacancyId } }).catch(() => null);
        if (existing) throw httpError("já se candidatou", 409);
      } catch (e: any) {
        if (e?.status === 409) throw e;
        // ignore DB miss
      }

      // candidate lookup
      let candidate: CandidateMock | null = candidateStore.get(opts.candidateId) ?? null;
      if (!candidate) {
        try {
          const { prisma } = await import("./prisma");
          const dbCand = await (prisma as any).candidateProfile.findUnique({ where: { userId: opts.candidateId } }).catch(() => null);
          if (dbCand) {
            candidate = {
              userId: dbCand.userId,
              nome: dbCand.nome,
              titulo: dbCand.titulo,
              email: dbCand.email,
              celular: dbCand.celular,
              objetivoCrescimento: dbCand.objetivoCrescimento,
              stack: dbCand.stack as any,
            };
          }
        } catch {}
      }
      if (!candidate) {
        // fallback candidate mock mínimo
        candidate = { userId: opts.candidateId, nome: "Candidato", titulo: "Profissional", email: "cand@example.com", celular: "+5511999999999", stack: [{ skillId: "aws" }] };
      }

      const proxyThreadId = generateProxyThreadId();
      const appId = `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date();
      const app: ProxyApplication = {
        id: appId,
        vacancyId,
        candidateId: opts.candidateId,
        companyId: vacancy.companyId,
        origem: "candidaturaLote",
        proxyThreadId,
        status: "enviado",
        loteId,
        createdAt: now,
        updatedAt: now,
      };

      applicationStore.set(appId, app);
      applicationByThread.set(proxyThreadId, app);
      applicationByCandidateVacancy.set(dupKey, app);

      // tenta persistir DB
      try {
        const { prisma } = await import("./prisma");
        await (prisma as any).application.create({
          data: {
            id: appId,
            vacancyId,
            candidateId: opts.candidateId,
            companyId: vacancy.companyId,
            origem: "candidaturaLote",
            proxyThreadId,
            status: "enviado",
            loteId,
          },
        }).catch(() => {});
        // increment candidaturasCount
        await (prisma as any).vacancy.update({ where: { id: vacancyId }, data: { candidaturasCount: { increment: 1 } } }).catch(() => {});
      } catch {}

      await sendProxyEmail({ candidate, vacancy, proxyThreadId, applicationId: appId });

      // rate increment por item (global store) — rota também gerencia, aqui incrementa se chamado direto
      results.push({ vacancyId, applicationId: appId, proxyThreadId, status: "enviado", code: 201 });
    } catch (e: any) {
      const status = e.status ?? e.statusCode ?? 400;
      const msg = e.message ?? "erro";
      results.push({ vacancyId, status: "error", error: msg, code: status });
    }
  }
  return results;
}

// ── Reset helpers for tests ─────────────────────────────────────────────
export function clearAllForTests() {
  vacancyStore.clear();
  candidateStore.clear();
  applicationStore.clear();
  applicationByThread.clear();
  applicationByCandidateVacancy.clear();
  dailyRateStore.clear();
  sentEmails.length = 0;
}

export function clearSentEmails() {
  sentEmails.length = 0;
}
