import {
  VACANCY_TTL_DAYS,
  CANDIDATE_TTL_DAYS,
  OTP_TTL_MINUTES,
  PURGE_AFTER_ARCHIVED_DAYS,
  vacancyExpiresAt,
  candidateExpiresAt,
  otpExpiresAt,
  isEligibleForPurge,
  withVacancyExpiry,
  withCandidateExpiry,
} from "../lib/hygiene";

describe("Hygiene helpers — expiresAt defaults (C2)", () => {
  it("VACANCY_TTL=14d, CANDIDATE_TTL=180d, OTP_TTL=5min, PURGE=30d", () => {
    expect(VACANCY_TTL_DAYS).toBe(14);
    expect(CANDIDATE_TTL_DAYS).toBe(180);
    expect(OTP_TTL_MINUTES).toBe(5);
    expect(PURGE_AFTER_ARCHIVED_DAYS).toBe(30);
  });

  it("vacancyExpiresAt = from +14d", () => {
    const from = new Date("2026-11-01T10:00:00Z");
    expect(vacancyExpiresAt(from).toISOString()).toBe("2026-11-15T10:00:00.000Z");
  });

  it("candidateExpiresAt = from +180d", () => {
    const from = new Date("2026-11-01T00:00:00Z");
    expect(candidateExpiresAt(from).toISOString()).toBe("2027-04-30T00:00:00.000Z");
  });

  it("otpExpiresAt = from +5min", () => {
    const from = new Date("2026-11-07T10:00:00Z");
    expect(otpExpiresAt(from).toISOString()).toBe("2026-11-07T10:05:00.000Z");
  });

  it("withVacancyExpiry auto-preenche se ausente, preserva se presente", () => {
    const from = new Date("2026-11-01T00:00:00Z");
    const auto = withVacancyExpiry({ titulo: "Dev", createdAt: from } as any);
    expect(auto.expiresAt.toISOString()).toBe("2026-11-15T00:00:00.000Z");
    const explicit = new Date("2026-12-01T00:00:00Z");
    const kept = withVacancyExpiry({ titulo: "Dev", expiresAt: explicit } as any);
    expect(kept.expiresAt).toBe(explicit);
  });

  it("withCandidateExpiry auto-preenche se ausente (usa updatedAt > createdAt > now)", () => {
    const updatedAt = new Date("2026-11-01T00:00:00Z");
    const auto = withCandidateExpiry({ nome: "Ana", updatedAt } as any);
    expect(auto.expiresAt.toISOString()).toBe("2027-04-30T00:00:00.000Z");
  });

  it("isEligibleForPurge: arquivado >=30d => true, else false", () => {
    const now = new Date("2026-11-07T00:00:00Z");
    const d30 = new Date("2026-10-08T00:00:00Z");
    const d29 = new Date("2026-10-09T00:00:00Z");
    const d31 = new Date("2026-10-07T00:00:00Z");
    expect(isEligibleForPurge("arquivado", d30, now)).toBe(true);
    expect(isEligibleForPurge("arquivado", d31, now)).toBe(true);
    expect(isEligibleForPurge("arquivado", d29, now)).toBe(false);
    expect(isEligibleForPurge("ativo", d30, now)).toBe(false);
    expect(isEligibleForPurge("arquivado", null, now)).toBe(false);
  });
});
