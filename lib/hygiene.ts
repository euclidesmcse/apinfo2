/**
 * Helpers de higiene/expiração — Fase 1
 * Centraliza regras de expiresAt para que queries de hygiene possam confiar.
 *
 * Vacancy  = now + 14 dias
 * CandidateProfile = now + 180 dias
 * OtpCode  = now + 5 minutos
 */

export const VACANCY_TTL_DAYS = 14;
export const CANDIDATE_TTL_DAYS = 180;
export const OTP_TTL_MINUTES = 5;
export const PURGE_AFTER_ARCHIVED_DAYS = 30;

export function vacancyExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + VACANCY_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function candidateExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + CANDIDATE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function otpExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + OTP_TTL_MINUTES * 60 * 1000);
}

/** Retorna true se candidate arquivado há >=30d é elegível para hard-delete (LGPD purge). */
export function isEligibleForPurge(
  status: string,
  arquivadoEm: Date | null,
  now: Date = new Date()
): boolean {
  if (status !== "arquivado") return false;
  if (!arquivadoEm) return false;
  const diffDays = (now.getTime() - arquivadoEm.getTime()) / (24 * 60 * 60 * 1000);
  return diffDays >= PURGE_AFTER_ARCHIVED_DAYS;
}

/** Helper para criar payload de Vacancy com expiresAt auto-preenchido se ausente. */
export function withVacancyExpiry<T extends { expiresAt?: Date; createdAt?: Date }>(data: T): T & { expiresAt: Date } {
  if (data.expiresAt) return data as T & { expiresAt: Date };
  return { ...data, expiresAt: vacancyExpiresAt(data.createdAt ?? new Date()) };
}

/** Helper para criar payload de CandidateProfile com expiresAt auto-preenchido se ausente. */
export function withCandidateExpiry<T extends { expiresAt?: Date; updatedAt?: Date; createdAt?: Date }>(data: T): T & { expiresAt: Date } {
  if (data.expiresAt) return data as T & { expiresAt: Date };
  const base = data.updatedAt ?? data.createdAt ?? new Date();
  return { ...data, expiresAt: candidateExpiresAt(base) };
}
