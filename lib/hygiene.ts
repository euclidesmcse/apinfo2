/**
 * lib/hygiene — Fase 1 Task 9
 * Regras 180d/14d + 3 nudges idempotentes + purge LGPD + WABA 24h fallback
 *
 * Vacancy  = now + 14 dias (aviso D12, arquiva D14)
 * CandidateProfile = now + 180 dias (nudges D150/D165/D175, arquiva D180)
 * Purge: arquivado há >=30d -> hard-delete
 */

export const VACANCY_TTL_DAYS = 14;
export const CANDIDATE_TTL_DAYS = 180;
export const OTP_TTL_MINUTES = 5;
export const PURGE_AFTER_ARCHIVED_DAYS = 30;

// marcos candidato (dias desde createdAt/updatedAt que gerou expiresAt)
export const CANDIDATE_NUDGE_DAYS = [150, 165, 175] as const;
export const CANDIDATE_ARCHIVE_DAY = 180;
export const VACANCY_WARN_DAY = 12;
export const VACANCY_ARCHIVE_DAY = 14;

export const NUDGE_MARCOS = {
  D150: "D150",
  D165: "D165",
  D175: "D175",
  D180: "D180",
  V_D12: "V_D12",
  V_D14: "V_D14",
} as const;
export type Marco = (typeof NUDGE_MARCOS)[keyof typeof NUDGE_MARCOS];

export function vacancyExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + VACANCY_TTL_DAYS * 24 * 60 * 60 * 1000);
}
export function candidateExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + CANDIDATE_TTL_DAYS * 24 * 60 * 60 * 1000);
}
export function otpExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + OTP_TTL_MINUTES * 60 * 1000);
}
export function isEligibleForPurge(status: string, arquivadoEm: Date | null, now: Date = new Date()): boolean {
  if (status !== "arquivado") return false;
  if (!arquivadoEm) return false;
  const diffDays = (now.getTime() - arquivadoEm.getTime()) / (24 * 60 * 60 * 1000);
  return diffDays >= PURGE_AFTER_ARCHIVED_DAYS;
}
export function withVacancyExpiry<T extends { expiresAt?: Date; createdAt?: Date }>(data: T): T & { expiresAt: Date } {
  if (data.expiresAt) return data as T & { expiresAt: Date };
  return { ...data, expiresAt: vacancyExpiresAt(data.createdAt ?? new Date()) };
}
export function withCandidateExpiry<T extends { expiresAt?: Date; updatedAt?: Date; createdAt?: Date }>(data: T): T & { expiresAt: Date } {
  if (data.expiresAt) return data as T & { expiresAt: Date };
  const base = data.updatedAt ?? data.createdAt ?? new Date();
  return { ...data, expiresAt: candidateExpiresAt(base) };
}

// ── Stores in-memory (MVP, in-process + dedupe idempotente) ──────────────
export type HygieneCandidate = {
  userId: string;
  nome?: string;
  email?: string;
  celular?: string;
  whatsappOpt?: boolean;
  // base para calcular dias: expiresAt - CANDIDATE_TTL_DAYS = origin
  expiresAt: Date;
  createdAt: Date;
  updatedAt?: Date;
  status: string; // ativo | arquivado | purgado
  arquivadoEm?: Date | null;
  // last WABA interaction (janela 24h). Se null, considera fora da janela.
  lastWabaInteractionAt?: Date | null;
  // vector/logs mock
  vectorId?: string;
};

export type HygieneVacancy = {
  id: string;
  companyId?: string;
  titulo?: string;
  expiresAt: Date;
  createdAt: Date;
  status: string; // ativa | arquivada
  arquivadoEm?: Date | null;
};

// HygieneEvent dedupe: userId+marco+date (YYYY-MM-DD)
export type HygieneEvent = { userId: string; marco: string; date: string; createdAt: Date };
export const hygieneEvents = new Map<string, HygieneEvent>(); // key `${userId}:${marco}:${date}`
export const hygieneCandidateStore = new Map<string, HygieneCandidate>(); // userId
export const hygieneVacancyStore = new Map<string, HygieneVacancy>(); // id
export const sentNudges: Array<{
  userId: string;
  marco: string;
  channel: "waba" | "email";
  fallbackFrom?: "waba";
  to: string;
  template?: string;
  date: string;
  createdAt: Date;
}> = [];
export const purgeLog: Array<{ userId: string; at: Date }> = [];

// ── helpers ───────────────────────────────────────────────────────────────
export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
function eventKey(userId: string, marco: string, date: string): string {
  return `${userId}:${marco}:${date}`;
}
export function hasHygieneEvent(userId: string, marco: string, date: string): boolean {
  return hygieneEvents.has(eventKey(userId, marco, date));
}
/** Tenta registrar dedupe. Retorna true se já existia (skip), false se novo (deve enviar). */
export function tryDedupe(userId: string, marco: string, date: string): boolean {
  const k = eventKey(userId, marco, date);
  if (hygieneEvents.has(k)) return true;
  hygieneEvents.set(k, { userId, marco, date, createdAt: new Date() });
  // persiste best-effort em prisma se disponível
  try {
    import("./prisma").then(({ prisma }) => {
      (prisma as any).hygieneEvent?.create?.({ data: { userId, marco, date } }).catch(() => {});
    }).catch(() => {});
  } catch {}
  return false;
}
export function daysSince(origin: Date, now: Date): number {
  const ms = now.getTime() - origin.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}
export function candidateOrigin(c: HygieneCandidate): Date {
  // origin = expiresAt - 180d (ou createdAt se expiresAt ausente)
  if (c.expiresAt) return new Date(c.expiresAt.getTime() - CANDIDATE_TTL_DAYS * 24 * 60 * 60 * 1000);
  return c.createdAt ?? c.updatedAt ?? new Date();
}
export function vacancyOrigin(v: HygieneVacancy): Date {
  if (v.expiresAt) return new Date(v.expiresAt.getTime() - VACANCY_TTL_DAYS * 24 * 60 * 60 * 1000);
  return v.createdAt ?? new Date();
}

export function hasAnyHygieneEvent(userId: string, marco: string): boolean {
  const prefix = `${userId}:${marco}:`;
  for (const k of hygieneEvents.keys()) if (k.startsWith(prefix)) return true;
  return false;
}

export function getCandidateMarco(candidate: HygieneCandidate, now: Date): Marco | null {
  if (candidate.status !== "ativo") return null;
  const origin = candidateOrigin(candidate);
  const d = daysSince(origin, now);
  if (d >= CANDIDATE_ARCHIVE_DAY) return NUDGE_MARCOS.D180;
  // Nudges use >= with dedupe window so a missed cron day recovers.
  // Windowed by next marco (150..164, 165..174, 175..179) so D165 doesn't map to overdue D150.
  if (d >= 150 && d < 165 && !hasAnyHygieneEvent(candidate.userId, NUDGE_MARCOS.D150)) return NUDGE_MARCOS.D150;
  if (d >= 165 && d < 175 && !hasAnyHygieneEvent(candidate.userId, NUDGE_MARCOS.D165)) return NUDGE_MARCOS.D165;
  if (d >= 175 && d < CANDIDATE_ARCHIVE_DAY && !hasAnyHygieneEvent(candidate.userId, NUDGE_MARCOS.D175)) return NUDGE_MARCOS.D175;
  return null;
}
export function getVacancyMarco(vacancy: HygieneVacancy, now: Date): Marco | null {
  if (vacancy.status !== "ativa") return null;
  const origin = vacancyOrigin(vacancy);
  const d = daysSince(origin, now);
  if (d >= VACANCY_ARCHIVE_DAY) return NUDGE_MARCOS.V_D14;
  if (d >= VACANCY_WARN_DAY && d < VACANCY_ARCHIVE_DAY && !hasAnyHygieneEvent(vacancy.id, NUDGE_MARCOS.V_D12)) return NUDGE_MARCOS.V_D12;
  return null;
}

// WABA janela 24h: só pode enviar template WABA se lastWabaInteractionAt dentro de 24h ou opt-in recente?
// Regra MVP: se whatsappOpt=true E lastWabaInteractionAt dentro de 24h => waba, senão fallback email.
export function isWithinWabaWindow(candidate: HygieneCandidate, now: Date): boolean {
  if (!candidate.whatsappOpt) return false;
  if (!candidate.lastWabaInteractionAt) return false;
  const diffMs = now.getTime() - candidate.lastWabaInteractionAt.getTime();
  return diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
}

export function resolveChannel(candidate: HygieneCandidate, now: Date): { channel: "waba" | "email"; fallback: boolean } {
  const within = isWithinWabaWindow(candidate, now);
  if (within) return { channel: "waba", fallback: false };
  // fallback e-mail: sempre disponível se tem email
  return { channel: "email", fallback: !within && !!candidate.whatsappOpt } as any;
}

// ── envio nudge (mock WABA + e-mail) ────────────────────────────────────
const WABA_TEMPLATES: Record<string, string> = {
  D150: "w2talent_nudge_d150_v1",
  D165: "w2talent_nudge_d165_v1",
  D175: "w2talent_nudge_d175_v1",
  D180: "w2talent_arquivado_v1",
  V_D12: "w2talent_vaga_aviso_d12_v1",
  V_D14: "w2talent_vaga_arquivada_v1",
};

export async function sendNudge(
  candidateOrVacancy: { userId?: string; id?: string; email?: string; celular?: string } & any,
  marco: string,
  now: Date = new Date()
): Promise<{ channel: "waba" | "email"; fallbackFrom?: string; skipped: boolean }> {
  const userId = (candidateOrVacancy as any).userId ?? (candidateOrVacancy as any).id;
  const date = todayKey(now);
  const isDup = tryDedupe(userId, marco, date);
  if (isDup) return { channel: "email", skipped: true };

  // resolve channel (candidate tem whatsappOpt/window, vacancy sempre email)
  let channel: "waba" | "email" = "email";
  let fallbackFrom: string | undefined;
  const asCandidate = hygieneCandidateStore.get(userId);
  if (asCandidate) {
    const resolved = resolveChannel(asCandidate, now);
    channel = resolved.channel;
    if (resolved.fallback && channel === "email") fallbackFrom = "waba";
  } else {
    // vacancy nudge (id prefix V_) => email para empresa
    channel = "email";
  }

  const to = (candidateOrVacancy as any).email ?? (candidateOrVacancy as any).celular ?? `${userId}@mock.local`;
  const template = WABA_TEMPLATES[marco] ?? `w2talent_${marco}`;

  sentNudges.push({ userId, marco, channel, fallbackFrom: fallbackFrom as any, to, template, date, createdAt: new Date(now) });

  // mock envio: se RESEND/SMS configurado tentaria, mas não quebra
  return { channel, fallbackFrom, skipped: false };
}

// ── arquiva / purge ─────────────────────────────────────────────────────
export function archiveCandidate(userId: string, now: Date = new Date()): HygieneCandidate | null {
  const c = hygieneCandidateStore.get(userId);
  if (!c) return null;
  if (c.status === "arquivado") return c;
  c.status = "arquivado";
  c.arquivadoEm = new Date(now);
  // sai do search: search filtra status=ativo, então arquivado já some
  try {
    import("./prisma").then(({ prisma }) => {
      (prisma as any).candidateProfile?.update?.({ where: { userId }, data: { status: "arquivado" } }).catch(() => {});
    }).catch(() => {});
  } catch {}
  return c;
}
export function archiveVacancy(id: string, now: Date = new Date()): HygieneVacancy | null {
  const v = hygieneVacancyStore.get(id);
  if (!v) return null;
  if (v.status === "arquivada") return v;
  v.status = "arquivada";
  v.arquivadoEm = new Date(now);
  try {
    import("./prisma").then(({ prisma }) => {
      (prisma as any).vacancy?.update?.({ where: { id }, data: { status: "arquivada" } }).catch(() => {});
    }).catch(() => {});
  } catch {}
  return v;
}

export function isSearchableCandidate(c: HygieneCandidate): boolean {
  return c.status === "ativo";
}
export function isSearchableVacancy(v: HygieneVacancy): boolean {
  return v.status === "ativa";
}

// purge hard-delete: remove de stores + prisma + vector + logs
export async function purgeCandidate(userId: string, now: Date = new Date()): Promise<boolean> {
  const c = hygieneCandidateStore.get(userId);
  if (!c) return false;
  if (!isEligibleForPurge(c.status, c.arquivadoEm ?? null, now)) return false;
  hygieneCandidateStore.delete(userId);
  // limpa eventos antigos desse user? purge remove tudo
  // remove hygieneEvents desse user (opcional)
  purgeLog.push({ userId, at: new Date(now) });
  // hard-delete DB + vector + logs
  try {
    const { prisma } = await import("./prisma");
    // delete embeddings/vector: campo embedding/vector é coluna; delete row já remove
    await (prisma as any).candidateProfile?.delete?.({ where: { userId } }).catch(() => {});
    // logs consent? purge LGPD deve apagar consentLogs e hygieneEvents do user
    await (prisma as any).consentLog?.deleteMany?.({ where: { userId } }).catch(() => {});
    await (prisma as any).hygieneEvent?.deleteMany?.({ where: { userId } }).catch(() => {});
  } catch {}
  // in-memory events purge
  for (const k of [...hygieneEvents.keys()]) if (k.startsWith(`${userId}:`)) hygieneEvents.delete(k);
  // remove nudges history? mantém purgeLog mas sentNudges pode manter para auditoria
  return true;
}

export async function purgeExpiredCandidates(now: Date = new Date()): Promise<string[]> {
  const purged: string[] = [];
  for (const [userId, c] of [...hygieneCandidateStore.entries()]) {
    if (isEligibleForPurge(c.status, c.arquivadoEm ?? null, now)) {
      const ok = await purgeCandidate(userId, now);
      if (ok) purged.push(userId);
    }
  }
  return purged;
}

// ── cron principal ───────────────────────────────────────────────────────
export type HygieneSummary = {
  date: string;
  candidates: { nudged: Array<{ userId: string; marco: string; channel: string }>; archived: string[]; purged: string[] };
  vacancies: { warned: string[]; archived: string[] };
  totalEvents: number;
};

export async function runHygieneCron(now: Date = new Date()): Promise<HygieneSummary> {
  const date = todayKey(now);
  const summary: HygieneSummary = {
    date,
    candidates: { nudged: [], archived: [], purged: [] },
    vacancies: { warned: [], archived: [] },
    totalEvents: 0,
  };

  // 1) candidatos
  for (const [userId, c] of [...hygieneCandidateStore.entries()]) {
    if (c.status !== "ativo") continue;
    const marco = getCandidateMarco(c, now);
    if (!marco) continue;
    if (marco === NUDGE_MARCOS.D180) {
      // arquiva + nudge D180 (1 vez, dedupado)
      const sent = await sendNudge(c as any, marco, now);
      if (!sent.skipped) summary.candidates.nudged.push({ userId, marco, channel: sent.channel });
      archiveCandidate(userId, now);
      summary.candidates.archived.push(userId);
      // também registra evento D180 já via sendNudge dedupe
      continue;
    }
    if (marco === NUDGE_MARCOS.D150 || marco === NUDGE_MARCOS.D165 || marco === NUDGE_MARCOS.D175) {
      const sent = await sendNudge(c as any, marco, now);
      if (!sent.skipped) summary.candidates.nudged.push({ userId, marco, channel: sent.channel });
    }
  }

  // 2) vagas
  for (const [id, v] of [...hygieneVacancyStore.entries()]) {
    if (v.status !== "ativa") continue;
    const marco = getVacancyMarco(v, now);
    if (!marco) continue;
    if (marco === NUDGE_MARCOS.V_D12) {
      const sent = await sendNudge({ userId: id, id, email: `rh-${id}@empresa.com` } as any, marco, now);
      if (!sent.skipped) summary.vacancies.warned.push(id);
    } else if (marco === NUDGE_MARCOS.V_D14) {
      const sent = await sendNudge({ userId: id, id, email: `rh-${id}@empresa.com` } as any, marco, now);
      // Always archive at D14 even if nudge was deduped (idempotency), but count nudge only if sent
      void sent;
      archiveVacancy(id, now);
      summary.vacancies.archived.push(id);
    }
  }

  // 3) purge D+30
  const purged = await purgeExpiredCandidates(now);
  summary.candidates.purged = purged;

  // tenta também varrer DB se disponível (best-effort)
  try {
    const { prisma } = await import("./prisma");
    // candidatos DB que não estão no store mas expiraram
    const dbCandidates: any[] = await (prisma as any).candidateProfile
      ?.findMany?.({ where: { status: "ativo" } })
      .catch(() => []) ?? [];
    for (const db of dbCandidates) {
      const exp = new Date(db.expiresAt);
      const origin = new Date(exp.getTime() - CANDIDATE_TTL_DAYS * 24 * 60 * 60 * 1000);
      const d = daysSince(origin, now);
      let marco: string | null = null;
      if (d >= 180) marco = "D180";
      else if (d === 175) marco = "D175";
      else if (d === 165) marco = "D165";
      else if (d === 150) marco = "D150";
      if (marco) {
        const c: any = { userId: db.userId, email: db.email, celular: db.celular, whatsappOpt: db.whatsappOpt, lastWabaInteractionAt: (db as any).lastWabaInteractionAt ?? (db as any).lastWhatsappAt ?? null };
        const sent = await sendNudge(c, marco, now);
        if (marco === "D180" && !sent.skipped) {
          await (prisma as any).candidateProfile?.update?.({ where: { userId: db.userId }, data: { status: "arquivado" } }).catch(() => {});
          summary.candidates.archived.push(db.userId);
        }
        if (!sent.skipped && marco !== "D180") summary.candidates.nudged.push({ userId: db.userId, marco, channel: sent.channel });
      }
    }
    // purge DB arquivados
    const arquivados: any[] = await (prisma as any).candidateProfile
      ?.findMany?.({ where: { status: "arquivado" } })
      .catch(() => []) ?? [];
    for (const a of arquivados) {
      // precisa arquivadoEm: usa updatedAt como fallback
      const arquivadoEm = (a as any).updatedAt ? new Date((a as any).updatedAt) : now;
      if (isEligibleForPurge("arquivado", arquivadoEm, now)) {
        await (prisma as any).candidateProfile?.delete?.({ where: { userId: a.userId } }).catch(() => {});
        summary.candidates.purged.push(a.userId);
      }
    }
  } catch {}

  summary.totalEvents = hygieneEvents.size;
  return summary;
}

// ── seed / reset helpers para testes ───────────────────────────────────
export function seedCandidateHygiene(data: Partial<HygieneCandidate> & { userId: string }): HygieneCandidate {
  const now = new Date();
  const createdAt = data.createdAt ?? now;
  const expiresAt = data.expiresAt ?? candidateExpiresAt(createdAt);
  const c: HygieneCandidate = {
    userId: data.userId,
    nome: data.nome ?? "Candidato Teste",
    email: data.email ?? "cand@example.com",
    celular: data.celular ?? "+5511999999999",
    whatsappOpt: data.whatsappOpt ?? false,
    expiresAt,
    createdAt,
    updatedAt: data.updatedAt ?? createdAt,
    status: (data.status as any) ?? "ativo",
    arquivadoEm: (data as any).arquivadoEm ?? null,
    lastWabaInteractionAt: (data as any).lastWabaInteractionAt ?? null,
    vectorId: data.vectorId ?? `vec_${data.userId}`,
  };
  hygieneCandidateStore.set(c.userId, c);
  return c;
}

export function seedVacancyHygiene(data: Partial<HygieneVacancy> & { id: string }): HygieneVacancy {
  const now = new Date();
  const createdAt = data.createdAt ?? now;
  const expiresAt = data.expiresAt ?? vacancyExpiresAt(createdAt);
  const v: HygieneVacancy = {
    id: data.id,
    companyId: data.companyId ?? `comp_${data.id}`,
    titulo: data.titulo ?? `Vaga ${data.id}`,
    expiresAt,
    createdAt,
    status: (data.status as any) ?? "ativa",
    arquivadoEm: (data as any).arquivadoEm ?? null,
  };
  hygieneVacancyStore.set(v.id, v);
  return v;
}

export function clearHygieneForTests() {
  hygieneCandidateStore.clear();
  hygieneVacancyStore.clear();
  hygieneEvents.clear();
  sentNudges.length = 0;
  purgeLog.length = 0;
}

// helpers para n8n email retry mapping
export function nudgeTemplateFor(marco: string): string {
  return WABA_TEMPLATES[marco] ?? `w2talent_${marco}`;
}
