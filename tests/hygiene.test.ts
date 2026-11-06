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
  // task9
  NUDGE_MARCOS,
  runHygieneCron,
  seedCandidateHygiene,
  seedVacancyHygiene,
  clearHygieneForTests,
  hygieneEvents,
  sentNudges,
  hygieneCandidateStore,
  hygieneVacancyStore,
  purgeLog,
  isSearchableCandidate,
  isSearchableVacancy,
  resolveChannel,
  isWithinWabaWindow,
} from "../lib/hygiene";

const DAY = 24 * 60 * 60 * 1000;

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

// ── Task 9 TDD ────────────────────────────────────────────────────────────
describe("Higiene + Nudges — Task 9 (TDD brief)", () => {
  const now = new Date("2026-11-07T10:00:00Z");

  beforeEach(() => clearHygieneForTests());

  it("1. CV D150/165/175 dispara 1 nudge cada, D180 arquiva e sai do search", async () => {
    // D150
    const c150 = seedCandidateHygiene({ userId: "u150", createdAt: new Date(now.getTime() - 150 * DAY) });
    // D165
    const c165 = seedCandidateHygiene({ userId: "u165", createdAt: new Date(now.getTime() - 165 * DAY) });
    const c175 = seedCandidateHygiene({ userId: "u175", createdAt: new Date(now.getTime() - 175 * DAY) });
    const c180 = seedCandidateHygiene({ userId: "u180", createdAt: new Date(now.getTime() - 180 * DAY) });

    const summary = await runHygieneCron(now);

    expect(sentNudges.filter((n) => n.userId === "u150" && n.marco === NUDGE_MARCOS.D150)).toHaveLength(1);
    expect(sentNudges.filter((n) => n.userId === "u165" && n.marco === NUDGE_MARCOS.D165)).toHaveLength(1);
    expect(sentNudges.filter((n) => n.userId === "u175" && n.marco === NUDGE_MARCOS.D175)).toHaveLength(1);
    // D180 nudge + arquiva
    expect(sentNudges.filter((n) => n.userId === "u180" && n.marco === NUDGE_MARCOS.D180)).toHaveLength(1);
    expect(summary.candidates.archived).toContain("u180");
    const archived = hygieneCandidateStore.get("u180")!;
    expect(archived.status).toBe("arquivado");
    expect(isSearchableCandidate(archived)).toBe(false);
    // D150 ainda searchable (não arquivado)
    expect(isSearchableCandidate(c150)).toBe(true);
    expect(isSearchableCandidate(c165)).toBe(true);
    expect(isSearchableCandidate(c175)).toBe(true);
  });

  it("2. idempotência: rodar cron 2x no mesmo dia não duplica nudge (dedupe userId+marco+date)", async () => {
    seedCandidateHygiene({ userId: "u-dedupe", createdAt: new Date(now.getTime() - 150 * DAY) });
    await runHygieneCron(now);
    const afterFirst = sentNudges.length;
    const eventsAfterFirst = hygieneEvents.size;
    expect(afterFirst).toBe(1);
    await runHygieneCron(now);
    expect(sentNudges.length).toBe(afterFirst);
    expect(hygieneEvents.size).toBe(eventsAfterFirst);
    // no dia seguinte permite novo nudge se marco mudar (D151 não tem marco, então continua 0)
    // mas se ainda D150 no dia seguinte com outro date, poderia re-nudgar — testamos que mesmo marco em outra data gera novo evento
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    // muda candidato para 165 para ter novo marco amanhã? Simula: candidato ainda D151 (sem marco) não nudga.
    // força: limpa e cria candidato D165 amanhã
    clearHygieneForTests();
    seedCandidateHygiene({ userId: "u-dedupe2", createdAt: new Date(tomorrow.getTime() - 150 * DAY) });
    await runHygieneCron(tomorrow);
    expect(sentNudges.filter((n) => n.date === "2026-11-08")).toHaveLength(1);
  });

  it("3. vaga D12 aviso, D14 arquiva", async () => {
    const v12 = seedVacancyHygiene({ id: "v12", createdAt: new Date(now.getTime() - 12 * DAY) });
    const v14 = seedVacancyHygiene({ id: "v14", createdAt: new Date(now.getTime() - 14 * DAY) });
    const v10 = seedVacancyHygiene({ id: "v10", createdAt: new Date(now.getTime() - 10 * DAY) });
    const summary = await runHygieneCron(now);
    expect(summary.vacancies.warned).toContain("v12");
    expect(summary.vacancies.archived).toContain("v14");
    expect(summary.vacancies.warned).not.toContain("v10");
    expect(summary.vacancies.archived).not.toContain("v10");
    expect(hygieneVacancyStore.get("v14")!.status).toBe("arquivada");
    expect(isSearchableVacancy(hygieneVacancyStore.get("v14")!)).toBe(false);
    expect(isSearchableVacancy(v12)).toBe(true); // aviso não arquiva
  });

  it("4. purge: arquivado há 30d -> hard-delete Postgres+vector+logs, não recuperável", async () => {
    const eligible = seedCandidateHygiene({
      userId: "u-purge30",
      createdAt: new Date(now.getTime() - 220 * DAY),
      status: "arquivado" as any,
      arquivadoEm: new Date(now.getTime() - 30 * DAY),
    } as any);
    const notYet = seedCandidateHygiene({
      userId: "u-purge29",
      createdAt: new Date(now.getTime() - 219 * DAY),
      status: "arquivado" as any,
      arquivadoEm: new Date(now.getTime() - 29 * DAY),
    } as any);
    const purged = await runHygieneCron(now);
    expect(purged.candidates.purged).toContain("u-purge30");
    expect(purged.candidates.purged).not.toContain("u-purge29");
    expect(hygieneCandidateStore.has("u-purge30")).toBe(false);
    expect(hygieneCandidateStore.has("u-purge29")).toBe(true);
    expect(purgeLog.find((p) => p.userId === "u-purge30")).toBeTruthy();
    // não recuperável: tentar re-arquivar não encontra
    expect(hygieneCandidateStore.get("u-purge30")).toBeUndefined();
  });

  it("5. WABA janela 24h: fora dela fallback e-mail (mock)", async () => {
    // dentro da janela -> waba
    const inside = seedCandidateHygiene({
      userId: "u-waba-in",
      createdAt: new Date(now.getTime() - 150 * DAY),
      whatsappOpt: true,
      lastWabaInteractionAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2h atrás
    } as any);
    expect(isWithinWabaWindow(inside, now)).toBe(true);
    expect(resolveChannel(inside, now).channel).toBe("waba");

    // fora da janela -> fallback email
    const outside = seedCandidateHygiene({
      userId: "u-waba-out",
      createdAt: new Date(now.getTime() - 150 * DAY),
      whatsappOpt: true,
      lastWabaInteractionAt: new Date(now.getTime() - 25 * 60 * 60 * 1000), // 25h atrás
    } as any);
    expect(isWithinWabaWindow(outside, now)).toBe(false);
    expect(resolveChannel(outside, now).channel).toBe("email");

    // sem opt -> sempre email
    const noOpt = seedCandidateHygiene({
      userId: "u-waba-noopt",
      createdAt: new Date(now.getTime() - 150 * DAY),
      whatsappOpt: false,
      lastWabaInteractionAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    } as any);
    expect(resolveChannel(noOpt, now).channel).toBe("email");

    // cron deve escolher canal correto e marcar fallbackFrom quando cai para email
    clearHygieneForTests();
    seedCandidateHygiene({
      userId: "u-waba-in",
      createdAt: new Date(now.getTime() - 150 * DAY),
      whatsappOpt: true,
      lastWabaInteractionAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      email: "in@example.com",
      celular: "+5511999999999",
    } as any);
    seedCandidateHygiene({
      userId: "u-waba-out",
      createdAt: new Date(now.getTime() - 150 * DAY),
      whatsappOpt: true,
      lastWabaInteractionAt: new Date(now.getTime() - 30 * 60 * 60 * 1000),
      email: "out@example.com",
      celular: "+5511999999998",
    } as any);
    await runHygieneCron(now);
    const nIn = sentNudges.find((n) => n.userId === "u-waba-in")!;
    const nOut = sentNudges.find((n) => n.userId === "u-waba-out")!;
    expect(nIn.channel).toBe("waba");
    expect(nOut.channel).toBe("email");
    expect(nOut.fallbackFrom).toBe("waba");
  });
});
