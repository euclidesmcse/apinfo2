/**
 * lib/vacancy — Vaga Canônica + CRUD + Expiração 14d (Task 4)
 * Consome: lib/taxonomy (normalizeSkill), lib/hygiene (vacancyExpiresAt)
 */
import { normalizeSkill } from "./taxonomy";
import { vacancyExpiresAt, VACANCY_TTL_DAYS } from "./hygiene";

export type VacancyStackItem = { skillId: string; nivel?: string; anos?: number };

export type VacancyPayload = {
  companyId: string;
  titulo: string;
  stack: VacancyStackItem[];
  descricaoBullets: string[];
  beneficios: string[];
  nivel?: string | null;
  regime?: string | null;
  localidade?: string | null;
  tipoContrato?: string | null;
  faixaDe: number | null;
  faixaAte: number | null;
  faixaMoeda: string;
  status: "ativa" | "arquivada";
  renovacoes: number;
  expiresAt: Date;
  views: number;
  candidaturasCount: number;
  companyValidacaoStatus?: string;
  _lastRenewAt?: Date;
};

function httpError(message: string, status: number): Error & { status: number; statusCode: number } {
  const e: any = new Error(message);
  e.status = status;
  e.statusCode = status;
  return e;
}

/** Normaliza lista bruta de skills para skillIds canônicos (filtra inválidos, dedupe). */
export function normalizeVacancyStack(rawSkills: unknown): string[] {
  if (!Array.isArray(rawSkills)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of rawSkills) {
    // raw pode ser string ou {skillId}
    const str = typeof raw === "string" ? raw : (raw as any)?.skillId ?? (raw as any)?.id ?? "";
    if (!str || typeof str !== "string") continue;
    const id = normalizeSkill(str.trim());
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Normaliza descricaoBullets: string com \n -> string[], string[] preservado, vazio -> [] */
export function normalizeDescricaoBullets(input: unknown): string[] {
  if (Array.isArray(input)) {
    return (input as any[])
      .map((v) => String(v ?? "").trim())
      .filter((v) => v.length > 0);
  }
  if (typeof input === "string") {
    if (!input.trim()) return [];
    return input
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

export function validateVacancy(input: any, opts?: { partial?: boolean }): void {
  if (!input || typeof input !== "object") throw httpError("payload inválido", 400);
  const partial = !!opts?.partial;
  const titulo = typeof input.titulo === "string" ? input.titulo.trim() : "";
  if (!partial) {
    if (!titulo) throw httpError("titulo obrigatório", 400);
    if (!input.companyId || typeof input.companyId !== "string" || !input.companyId.trim()) {
      throw httpError("companyId obrigatório", 400);
    }
  } else {
    if (input.titulo !== undefined && !titulo) throw httpError("titulo obrigatório", 400);
    if (titulo.length > 120) throw httpError("titulo deve ter no máximo 120 caracteres", 400);
  }
  // stack opcional — se fornecido, deve ser array (mas vazio é ok)
  if (input.stack !== undefined && !Array.isArray(input.stack)) {
    throw httpError("stack deve ser array", 422);
  }
  // faixa opcional — se fornecida, deve ser número (rejeita NaN), e faixaDe <= faixaAte quando ambos numéricos
  const hasDe = input.faixaDe !== undefined && input.faixaDe !== null;
  const hasAte = input.faixaAte !== undefined && input.faixaAte !== null;
  if (hasDe && (typeof input.faixaDe !== "number" || Number.isNaN(input.faixaDe))) {
    throw httpError("faixaDe deve ser número ou null", 422);
  }
  if (hasAte && (typeof input.faixaAte !== "number" || Number.isNaN(input.faixaAte))) {
    throw httpError("faixaAte deve ser número ou null", 422);
  }
  if (hasDe && hasAte && input.faixaDe > input.faixaAte) {
    throw httpError("faixaDe não pode ser maior que faixaAte", 400);
  }
}

export function canCreateForCompany(company: { validacaoStatus?: string } | null | undefined): {
  allowed: boolean;
  reason?: string;
  status?: string;
} {
  const status = (company as any)?.validacaoStatus ?? "pendente";
  if (status === "rejeitado") {
    return { allowed: false, reason: "empresa rejeitada, não pode criar vagas", status };
  }
  // pendente e validado podem criar; pendente cria mas com validacao pendente (spec)
  return { allowed: true, status };
}

/** UTC start-of-day em ms — evita bug de timezone com setHours local. */
export function utcDayStartMs(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Verifica se já foi renovada hoje (UTC) — idempotência por dia. */
export function isAlreadyRenewedToday(
  existing: { updatedAt?: Date | string | null; expiresAt: Date | string },
  now: Date
): boolean {
  const nextExpiresAt = vacancyExpiresAt(now);
  const lastRenewMs = existing.updatedAt ? new Date(existing.updatedAt as any).getTime() : 0;
  const todayStartMs = utcDayStartMs(now);
  return lastRenewMs >= todayStartMs && new Date(existing.expiresAt as any).getTime() === nextExpiresAt.getTime();
}

/**
 * Helper compartilhado para renew idempotente (I2).
 * Centraliza dedupe UTC + cálculo via renewVacancy.
 * Retorna {alreadyRenewed, nextExpiresAt, renewed?}
 */
export function renewIdempotent(
  existing: { expiresAt: Date | string; renovacoes?: number | null; status?: string; updatedAt?: Date | string | null; _lastRenewAt?: Date },
  now: Date = new Date()
): { alreadyRenewed: boolean; nextExpiresAt: Date; renewed?: VacancyPayload } {
  const nextExpiresAt = vacancyExpiresAt(now);
  if (isAlreadyRenewedToday(existing as any, now)) {
    return { alreadyRenewed: true, nextExpiresAt };
  }
  const input: any = {
    ...(existing as any),
    expiresAt: new Date(existing.expiresAt as any),
    renovacoes: (existing as any).renovacoes ?? 0,
    status: (existing as any).status ?? "ativa",
    _lastRenewAt: (existing as any)._lastRenewAt ?? ((existing as any).updatedAt ? new Date((existing as any).updatedAt) : undefined),
  };
  const renewed = renewVacancy(input, now);
  if (renewed === input) {
    return { alreadyRenewed: true, nextExpiresAt: new Date(existing.expiresAt as any) };
  }
  return { alreadyRenewed: false, nextExpiresAt: renewed.expiresAt, renewed };
}

export function buildVacancyPayload(input: any, now: Date = new Date()): VacancyPayload {
  validateVacancy(input);

  const stackIds = normalizeVacancyStack(input.stack ?? []);
  const stack: VacancyStackItem[] = stackIds.map((skillId) => ({ skillId }));

  const descricaoBullets = normalizeDescricaoBullets(input.descricaoBullets ?? input.descricao ?? "");
  const beneficios = normalizeDescricaoBullets(input.beneficios ?? []);

  const faixaDe = typeof input.faixaDe === "number" ? input.faixaDe : null;
  const faixaAte = typeof input.faixaAte === "number" ? input.faixaAte : null;
  const faixaMoeda = typeof input.faixaMoeda === "string" && input.faixaMoeda.trim() ? input.faixaMoeda.trim() : "BRL";

  const companyStatus =
    (input.company as any)?.validacaoStatus ??
    (input.companyValidacaoStatus as string) ??
    (input.validacaoStatus as string) ??
    "pendente";

  const expiresAt = vacancyExpiresAt(now);

  return {
    companyId: String(input.companyId).trim(),
    titulo: String(input.titulo).trim().slice(0, 120),
    stack,
    descricaoBullets,
    beneficios,
    nivel: input.nivel ?? null,
    regime: input.regime ?? null,
    localidade: input.localidade ?? null,
    tipoContrato: input.tipoContrato ?? null,
    faixaDe,
    faixaAte,
    faixaMoeda,
    status: "ativa",
    renovacoes: 0,
    expiresAt,
    views: 0,
    candidaturasCount: 0,
    companyValidacaoStatus: companyStatus,
    _lastRenewAt: undefined,
  };
}

/** Renova vaga: estende expiresAt para now+14d, incrementa renovacoes, idempotente se mesmo now */
export function renewVacancy(
  vacancy: VacancyPayload & { expiresAt: Date; renovacoes: number; status: string; _lastRenewAt?: Date },
  now: Date = new Date()
): VacancyPayload {
  const nextExpiresAt = vacancyExpiresAt(now);
  // idempotência: se já foi renovada neste mesmo instante e expiresAt já é next, não incrementa
  const sameInstant =
    vacancy._lastRenewAt != null &&
    vacancy._lastRenewAt.getTime() === now.getTime() &&
    vacancy.expiresAt instanceof Date &&
    vacancy.expiresAt.getTime() === nextExpiresAt.getTime();
  if (sameInstant) {
    return vacancy as unknown as VacancyPayload;
  }
  if (vacancy.expiresAt instanceof Date && vacancy.expiresAt.getTime() === nextExpiresAt.getTime() && vacancy._lastRenewAt) {
    // fallback idempotência sem _lastRenewAt prévio mas mesmo expiresAt
    return vacancy as unknown as VacancyPayload;
  }
  return {
    ...(vacancy as any),
    expiresAt: nextExpiresAt,
    renovacoes: (vacancy.renovacoes ?? 0) + 1,
    status: "ativa" as const,
    _lastRenewAt: now,
  };
}

export function isVacancyExpired(
  vacancy: { expiresAt: Date | string; status?: string },
  now: Date = new Date()
): boolean {
  const exp = vacancy.expiresAt instanceof Date ? vacancy.expiresAt : new Date(vacancy.expiresAt);
  return exp.getTime() <= now.getTime();
}

/**
 * Score de ranking considerando faixa (não quebra quando faixa null).
 * Retorna 0..100. Lógica simplificada: base 50 + ajuste por sobreposição faixa vs pretensão.
 */
export function rankingScoreWithFaixa(
  vacancy: { faixaDe: number | null; faixaAte: number | null },
  candidate: { pretensaoDe?: number | null; pretensaoAte?: number | null }
): number {
  // sem faixa => neutro
  if (vacancy.faixaDe == null && vacancy.faixaAte == null) return 50;
  const vDe = vacancy.faixaDe ?? 0;
  const vAte = vacancy.faixaAte ?? Number.MAX_SAFE_INTEGER;
  const cDe = candidate?.pretensaoDe ?? null;
  const cAte = candidate?.pretensaoAte ?? null;
  if (cDe == null && cAte == null) return 50;
  const cLow = cDe ?? 0;
  const cHigh = cAte ?? Number.MAX_SAFE_INTEGER;
  // overlap
  const overlapLow = Math.max(vDe, cLow);
  const overlapHigh = Math.min(vAte, cHigh);
  if (overlapLow <= overlapHigh) return 80; // compatível
  // sem overlap: penaliza proporcional à distância
  const gap = overlapLow - overlapHigh;
  const range = Math.max(vAte - vDe, cHigh - cLow, 1);
  const penalty = Math.min(40, (gap / range) * 40);
  return Math.max(10, Math.round(60 - penalty));
}

export { VACANCY_TTL_DAYS, vacancyExpiresAt };
