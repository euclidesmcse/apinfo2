// Task 4 TDD — deve FALHAR antes da implementação, PASSAR depois
import * as fs from "fs";
import * as path from "path";
import { normalizeSkill } from "../lib/taxonomy";
import { vacancyExpiresAt, VACANCY_TTL_DAYS } from "../lib/hygiene";

// Vai falhar até lib/vacancy existir
import {
  validateVacancy,
  buildVacancyPayload,
  renewVacancy,
  isVacancyExpired,
  normalizeVacancyStack,
  normalizeDescricaoBullets,
  canCreateForCompany,
  rankingScoreWithFaixa,
} from "../lib/vacancy";

describe("Vaga Canônica + CRUD + Expiração 14d (Task 4)", () => {
  const companyPendente = { id: "comp-1", nome: "Acme TI", validacaoStatus: "pendente" as const, plano: "free" as const };
  const companyValidada = { id: "comp-2", nome: "Acme Validada", validacaoStatus: "validado" as const, plano: "pro" as const };

  describe("1. create vaga gera expiresAt now+14d, status ativa", () => {
    it("buildVacancyPayload calcula expiresAt = now+14d e status ativa", () => {
      const now = new Date("2026-11-07T10:00:00Z");
      const payload = buildVacancyPayload(
        {
          companyId: companyPendente.id,
          titulo: "Engenheiro Cloud Pleno",
          stack: ["AWS", "React"],
          descricaoBullets: "Migrar workloads para EKS\nImplementar CI/CD",
          regime: "CLT",
          localidade: "remoto",
        } as any,
        now
      );
      expect(payload.status).toBe("ativa");
      expect(payload.renovacoes).toBe(0);
      // 14 dias depois
      expect(payload.expiresAt.toISOString()).toBe("2026-11-21T10:00:00.000Z");
      // higiene helper deve bater
      expect(vacancyExpiresAt(now).toISOString()).toBe(payload.expiresAt.toISOString());
      expect(VACANCY_TTL_DAYS).toBe(14);
      // titulo obrigatório
      expect(payload.titulo).toMatch(/Cloud/i);
      // stack normalizado via taxonomy
      expect(payload.stack.length).toBeGreaterThanOrEqual(1);
      expect(payload.stack[0].skillId).toBe("aws");
      expect(normalizeSkill(payload.stack[0].skillId)).toBe("aws");
    });

    it("validateVacancy lança 400 se faltar titulo ou companyId", () => {
      expect(() => validateVacancy({ titulo: "", companyId: "x" } as any)).toThrow();
      let err: any;
      try { validateVacancy({ titulo: "", companyId: "x" } as any); } catch (e:any){ err=e; }
      expect([400, 422].includes(err.status ?? err.statusCode)).toBe(true);
      expect(() => validateVacancy({ titulo: "Dev" } as any)).toThrow();
      expect(() => validateVacancy({ titulo: "Dev", companyId: "c1", stack: [] } as any)).not.toThrow();
    });

    it("stack validado via taxonomy — sinônimos normalizados, inválidos filtrados", () => {
      const normalized = normalizeVacancyStack(["Amazon Web Services", "react.js", ".net", "skillInexistenteXYZ"]);
      expect(normalized).toContain("aws");
      expect(normalized).toContain("react");
      expect(normalized).toContain("dotnet");
      expect(normalized).not.toContain("skillInexistenteXYZ");
      expect(normalized.length).toBe(3);
    });

    it("descricaoBullets normalizado para array bullets (string -> array, array preservado)", () => {
      const a = normalizeDescricaoBullets("linha1\nlinha2\n\nlinha3");
      expect(Array.isArray(a)).toBe(true);
      expect(a.length).toBe(3);
      expect(a[0]).toBe("linha1");
      const b = normalizeDescricaoBullets(["já array", "segundo bullet"]);
      expect(b).toEqual(["já array", "segundo bullet"]);
      const c = normalizeDescricaoBullets("");
      expect(Array.isArray(c)).toBe(true);
    });
  });

  describe("2. faixa opcional: sem faixa cria com null e não quebra ranking", () => {
    it("sem faixa cria com faixaDe/faixaAte null", () => {
      const now = new Date("2026-11-07T10:00:00Z");
      const payload = buildVacancyPayload(
        { companyId: "c1", titulo: "Dev", stack: ["aws"], descricaoBullets: ["x"] } as any,
        now
      );
      expect(payload.faixaDe).toBeNull();
      expect(payload.faixaAte).toBeNull();
      // faixaMoeda default BRL mesmo sem faixa
      expect(payload.faixaMoeda).toBe("BRL");
    });

    it("com faixa preserva valores", () => {
      const payload = buildVacancyPayload(
        { companyId: "c1", titulo: "Dev", stack: [], descricaoBullets: ["x"], faixaDe: 8000, faixaAte: 12000, faixaMoeda: "BRL" } as any
      );
      expect(payload.faixaDe).toBe(8000);
      expect(payload.faixaAte).toBe(12000);
    });

    it("rankingScoreWithFaixa não quebra quando faixa é null", () => {
      const vacancySemFaixa = buildVacancyPayload({ companyId: "c1", titulo: "Dev", stack: [{ skillId: "aws" }], descricaoBullets: ["x"] } as any);
      const vacancyComFaixa = buildVacancyPayload({ companyId: "c1", titulo: "Dev", stack: [{ skillId: "aws" }], descricaoBullets: ["x"], faixaDe: 8000, faixaAte: 12000 } as any);
      const candidateStub = { pretensaoDe: 9000, pretensaoAte: 11000 };
      // não deve lançar
      expect(() => rankingScoreWithFaixa(vacancySemFaixa as any, candidateStub as any)).not.toThrow();
      expect(() => rankingScoreWithFaixa(vacancyComFaixa as any, candidateStub as any)).not.toThrow();
      const scoreSem = rankingScoreWithFaixa(vacancySemFaixa as any, candidateStub as any);
      const scoreCom = rankingScoreWithFaixa(vacancyComFaixa as any, candidateStub as any);
      expect(typeof scoreSem).toBe("number");
      expect(typeof scoreCom).toBe("number");
      expect(scoreSem).toBeGreaterThanOrEqual(0);
      expect(scoreSem).toBeLessThanOrEqual(100);
    });
  });

  describe("3. renew D12 estende +14d, sem renew expira/arquiva", () => {
    it("renew estende expiresAt +14d a partir de now, incrementa renovacoes e mantém ativa", () => {
      const createdAt = new Date("2026-11-01T10:00:00Z");
      const original = buildVacancyPayload({ companyId: "c1", titulo: "Dev", stack: [], descricaoBullets: ["x"] } as any, createdAt);
      expect(original.expiresAt.toISOString()).toBe("2026-11-15T10:00:00.000Z");
      // D12 = 2026-11-13, renova
      const renewAt = new Date("2026-11-13T10:00:00Z");
      const renewed = renewVacancy(original as any, renewAt);
      expect(renewed.expiresAt.toISOString()).toBe("2026-11-27T10:00:00.000Z");
      expect(renewed.renovacoes).toBe(1);
      expect(renewed.status).toBe("ativa");
    });

    it("renew idempotente: duas chamadas com mesmo now retornam mesmo expiresAt", () => {
      const base = buildVacancyPayload({ companyId: "c1", titulo: "Dev", stack: [], descricaoBullets: ["x"] } as any, new Date("2026-11-01T10:00:00Z"));
      const at = new Date("2026-11-13T10:00:00Z");
      const r1 = renewVacancy(base as any, at);
      // chamada idempotente: passar r1 novamente com mesmo at não deve somar +14 de novo
      const r2 = renewVacancy(r1 as any, at);
      expect(r1.expiresAt.toISOString()).toBe(r2.expiresAt.toISOString());
      // renovacoes não deve duplicar no mesmo instante
      expect(r2.renovacoes).toBe(r1.renovacoes);
    });

    it("sem renew, após 14d isVacancyExpired true e status deve arquivar", () => {
      const createdAt = new Date("2026-11-01T10:00:00Z");
      const v = buildVacancyPayload({ companyId: "c1", titulo: "Dev", stack: [], descricaoBullets: ["x"] } as any, createdAt);
      const beforeExpiry = new Date("2026-11-14T23:59:59Z");
      const afterExpiry = new Date("2026-11-16T00:00:00Z");
      expect(isVacancyExpired(v as any, beforeExpiry)).toBe(false);
      expect(isVacancyExpired(v as any, afterExpiry)).toBe(true);
      // D14 arquiva
      expect(isVacancyExpired(v as any, new Date("2026-11-15T10:00:01Z"))).toBe(true);
    });
  });

  describe("4. empresa sem validação ainda cria mas com validacao=pendente", () => {
    it("canCreateForCompany permite pendente e validado, bloqueia rejeitado", () => {
      expect(canCreateForCompany(companyPendente as any)).toEqual(expect.objectContaining({ allowed: true }));
      expect(canCreateForCompany(companyValidada as any)).toEqual(expect.objectContaining({ allowed: true }));
      const rejeitada = { id: "c3", validacaoStatus: "rejeitado" } as any;
      const res = canCreateForCompany(rejeitada);
      expect(res.allowed).toBe(false);
    });

    it("buildVacancyPayload com company pendente não bloqueia, payload carrega validacao pendente", () => {
      const payload = buildVacancyPayload(
        { companyId: companyPendente.id, titulo: "Dev", stack: [], descricaoBullets: ["x"], company: companyPendente } as any
      );
      expect(payload.companyValidacaoStatus).toBe("pendente");
      expect(payload.status).toBe("ativa");
    });

    it("routes e componente existem e contêm contratos esperados", () => {
      const routeList = path.join(__dirname, "../app/api/vacancies/route.ts");
      const routeId = path.join(__dirname, "../app/api/vacancies/[id]/route.ts");
      const formComp = path.join(__dirname, "../components/vacancy-form.tsx");
      expect(fs.existsSync(routeList)).toBe(true);
      expect(fs.existsSync(routeId)).toBe(true);
      expect(fs.existsSync(formComp)).toBe(true);

      const srcList = fs.readFileSync(routeList, "utf-8");
      expect(srcList).toMatch(/vacancyExpiresAt|VACANCY_TTL|expiresAt/i);
      expect(srcList).toMatch(/validateVacancy|buildVacancyPayload/i);
      // POST deve existir
      expect(srcList).toMatch(/POST|handleVacancyPOST/i);

      const srcId = fs.readFileSync(routeId, "utf-8");
      // deve conter renew
      expect(srcId).toMatch(/renew/i);
      expect(srcId).toMatch(/PATCH|renewVacancy/i);

      const formSrc = fs.readFileSync(formComp, "utf-8");
      expect(formSrc).toMatch(/titulo/i);
      expect(formSrc).toMatch(/stack|skill/i);
      expect(formSrc).toMatch(/faixaDe|faixaAte|faixa/i);
      expect(formSrc).toMatch(/descricaoBullets|beneficios/i);
      expect(formSrc).toMatch(/VacancyForm/i);
    });
  });
});
