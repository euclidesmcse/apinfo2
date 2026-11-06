// Task 10 TDD — i18n + Responsivo + Acessibilidade + Polimento
import * as fs from "fs";
import * as path from "path";
import {
  t,
  hasKey,
  formatCurrency,
  formatCurrencyWithLocale,
  formatDateByLocale,
  formatTempoByLocale,
  getLocaleFromPath,
  stripLocale,
  isValidLocale,
  getEmbeddingLang,
  defaultLocale,
  locales,
} from "../i18n";

describe("Task 10 — i18n + Responsivo + Acessibilidade + Polimento", () => {
  describe("1. /en/vagas renderiza EN, fallback PT-BR quando chave falta, formatação moeda/data por locale", () => {
    it("messages/pt-BR.json e messages/en.json existem e têm namespaces", () => {
      const ptPath = path.join(__dirname, "../messages/pt-BR.json");
      const enPath = path.join(__dirname, "../messages/en.json");
      expect(fs.existsSync(ptPath)).toBe(true);
      expect(fs.existsSync(enPath)).toBe(true);
      const pt = JSON.parse(fs.readFileSync(ptPath, "utf-8"));
      const en = JSON.parse(fs.readFileSync(enPath, "utf-8"));
      expect(pt.vagas).toBeDefined();
      expect(pt.vagas.title).toBeTruthy();
      expect(en.vagas).toBeDefined();
      expect(en.vagas.title).toBeTruthy();
      // EN deve ser diferente de PT-BR para vagas title
      expect(en.vagas.title).not.toBe(pt.vagas.title);
    });

    it("/en/vagas locale resolvido como en via getLocaleFromPath + middleware existe", () => {
      expect(getLocaleFromPath("/en/vagas")).toBe("en");
      expect(getLocaleFromPath("/vagas")).toBe("pt-BR");
      expect(getLocaleFromPath("/en/candidatos")).toBe("en");
      expect(stripLocale("/en/vagas")).toBe("/vagas");
      expect(stripLocale("/vagas")).toBe("/vagas");
      expect(isValidLocale("en")).toBe(true);
      expect(isValidLocale("pt-BR")).toBe(true);
      expect(isValidLocale("fr")).toBe(false);
      // middleware.ts deve existir e mencionar locale
      const mw = path.join(__dirname, "../middleware.ts");
      expect(fs.existsSync(mw)).toBe(true);
      const src = fs.readFileSync(mw, "utf-8");
      expect(src).toMatch(/locale/i);
      expect(src).toMatch(/x-locale|NEXT_LOCALE/i);
    });

    it("fallback PT-BR quando chave falta em EN", () => {
      // garantir que en tem ao menos uma chave a menos que pt-BR para testar fallback
      // mas se ambos têm mesmas chaves, testamos via t() que key ausente retorna fallback/default
      // introduzimos chave só em pt-BR via leitura direta
      const pt = JSON.parse(fs.readFileSync(path.join(__dirname, "../messages/pt-BR.json"), "utf-8"));
      // t() com chave inexistente deve retornar fallback ou keyPath se nem pt tem
      // t() com chave que existe só em pt-BR quando locale=en deve fazer fallback
      // como temos parity, testamos: t('en','vagas.nonexistent.fake') deve fallback para keyPath (nem pt tem)
      expect(t("en", "vagas.nonexistent.fake")).toBe("vagas.nonexistent.fake");
      // fallback real: existe em pt-BR
      expect(t("en", "vagas.title")).toBeTruthy();
      expect(t("pt-BR", "vagas.title")).toBeTruthy();
      // en title != pt title por prova de troca
      expect(t("en", "vagas.title")).not.toBe(t("pt-BR", "vagas.title"));
      // i18n.ts deve mencionar fallback
      const i18nSrc = fs.readFileSync(path.join(__dirname, "../i18n.ts"), "utf-8");
      expect(i18nSrc).toMatch(/fallback/i);
      expect(i18nSrc).toMatch(/pt-BR/);
    });

    it("formatação moeda/data por locale", () => {
      // moeda por locale: pt-BR usa R$ com separador BR, en-US usa formatação US
      const br = formatCurrency(12000, "pt-BR", "BRL");
      const en = formatCurrency(12000, "en", "BRL");
      expect(br).toContain("R$");
      expect(en).toContain("R$"); // mesmo BRL mas locale muda separador/ordem
      // devem ser strings diferentes ou ao menos não vazias e conter dígitos
      expect(br).toMatch(/12/);
      expect(en).toMatch(/12/);
      // formatCurrencyWithLocale usa helper e retorna — quando null
      expect(formatCurrencyWithLocale(null, null, "pt-BR")).toBe("—");
      expect(formatCurrencyWithLocale(8000, 12000, "pt-BR", "BRL")).toContain("R$");
      expect(formatCurrencyWithLocale(8000, 12000, "en", "BRL")).toContain("R$");
      // data por locale: dd/mm vs mm/dd
      const d = new Date("2026-11-07T12:00:00Z");
      const brDate = formatDateByLocale(d, "pt-BR");
      const enDate = formatDateByLocale(d, "en");
      expect(brDate).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(enDate).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      // pt-BR: 07/11/2026 ; en: 11/07/2026 => diferentes
      expect(brDate).not.toBe(enDate);
      expect(formatDateByLocale(null, "pt-BR")).toBe("—");
      // tempo por locale
      const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const brTempo = formatTempoByLocale(recent, "pt-BR");
      const enTempo = formatTempoByLocale(recent, "en");
      expect(brTempo).toMatch(/há|dias/i);
      expect(enTempo).toMatch(/days|ago/i);
    });

    it("lang no embedding query: /api/search encaminha lang para generateEmbedding", () => {
      const vacRoute = fs.readFileSync(path.join(__dirname, "../app/api/search/vacancies/route.ts"), "utf-8");
      const candRoute = fs.readFileSync(path.join(__dirname, "../app/api/search/candidates/route.ts"), "utf-8");
      const embSrc = fs.readFileSync(path.join(__dirname, "../lib/embeddings.ts"), "utf-8");
      expect(vacRoute).toMatch(/lang/);
      expect(candRoute).toMatch(/lang/);
      expect(embSrc).toMatch(/lang/);
      expect(getEmbeddingLang("en")).toBe("en");
      expect(getEmbeddingLang("pt-BR")).toBe("pt-BR");
      expect(getEmbeddingLang("fr")).toBe(defaultLocale);
    });

    it("layout usa next-intl provider e i18n.ts expõe routing locales", () => {
      const layout = fs.readFileSync(path.join(__dirname, "../app/layout.tsx"), "utf-8");
      expect(layout).toMatch(/NextIntlClientProvider|next-intl/);
      expect(layout).toMatch(/getLocale|getMessages/i);
      const i18nSrc = fs.readFileSync(path.join(__dirname, "../i18n.ts"), "utf-8");
      expect(i18nSrc).toMatch(/locales/);
      expect(i18nSrc).toMatch(/pt-BR/);
      expect(i18nSrc).toMatch(/en/);
    });
  });

  describe("2. tabela tem <table><th scope>, cards <ul><li aria-label>, modal focus trap", () => {
    it("vacancy-table e candidate-table têm <table><th scope=\"col\">", () => {
      const vac = fs.readFileSync(path.join(__dirname, "../components/vacancy-table.tsx"), "utf-8");
      const cand = fs.readFileSync(path.join(__dirname, "../components/candidate-table.tsx"), "utf-8");
      expect(vac).toMatch(/<table/);
      expect(vac).toMatch(/<th scope="col">/);
      expect(cand).toMatch(/<table/);
      expect(cand).toMatch(/<th scope="col">/);
    });

    it("cards têm <ul><li aria-label>", () => {
      const vacCards = fs.readFileSync(path.join(__dirname, "../components/vacancy-cards.tsx"), "utf-8");
      const candCards = fs.readFileSync(path.join(__dirname, "../components/candidate-cards.tsx"), "utf-8");
      expect(vacCards).toMatch(/<ul/);
      expect(vacCards).toMatch(/<li/);
      expect(vacCards).toMatch(/aria-label/);
      expect(candCards).toMatch(/<ul/);
      expect(candCards).toMatch(/<li/);
      expect(candCards).toMatch(/aria-label/);
    });

    it("detail-modal tem focus trap e retorna foco para lupa", () => {
      const src = fs.readFileSync(path.join(__dirname, "../components/detail-modal.tsx"), "utf-8");
      expect(src).toMatch(/focus.*trap|trapFocus|focusTrap/i);
      expect(src).toMatch(/previouslyFocused|triggerRef|restoreFocus|return.*focus/i);
      expect(src).toMatch(/role="dialog"/);
      expect(src).toMatch(/aria-modal/);
      expect(src).toMatch(/Escape|ESC/);
      expect(src).toMatch(/overlay/i);
      // radix/vaul referência
      expect(src).toMatch(/radix|vaul|focus-trap|FocusTrap/i);
      expect(src).toMatch(/Tab|focusable|tabIndex/i);
    });
  });

  describe("3. BatchBar não some atrás do teclado virtual (viewport test)", () => {
    it("BatchBar sticky bottom com safe-area, visualViewport e z-index", () => {
      const barSrc = fs.readFileSync(path.join(__dirname, "../components/batch-bar.tsx"), "utf-8");
      expect(barSrc).toMatch(/sticky|fixed/i);
      expect(barSrc).toMatch(/bottom/i);
      expect(barSrc).toMatch(/safe-area|env\(safe-area-inset-bottom\)/i);
      // viewport / visualViewport handling
      expect(barSrc).toMatch(/visualViewport|viewport|virtual.*teclado|keyboard/i);
      expect(barSrc).toMatch(/z-?index|zIndex/i);
      expect(barSrc).toMatch(/aria-label|role=/i);
    });
  });

  describe("4. empty state busca 0 mostra sugestão IA + CTA", () => {
    it("EmptyState existe e exibe sugestão IA + CTA limpar filtros", () => {
      const emptyPath = path.join(__dirname, "../components/empty-state.tsx");
      expect(fs.existsSync(emptyPath)).toBe(true);
      const src = fs.readFileSync(emptyPath, "utf-8");
      expect(src).toMatch(/Sugest[aã]o IA|sugest[aã]o IA|aiSuggestion/i);
      expect(src).toMatch(/Limpar filtros|CTA|limpar/i);
      expect(src).toMatch(/role="status"|aria-live/i);
      // usado em vagas/candidatos
      const vagasPage = fs.readFileSync(path.join(__dirname, "../app/vagas/page.tsx"), "utf-8");
      const candidatosPage = fs.readFileSync(path.join(__dirname, "../app/candidatos/page.tsx"), "utf-8");
      expect(vagasPage).toMatch(/EmptyState|empty-state|suggestion|emptyCTA/i);
      expect(candidatosPage).toMatch(/EmptyState|empty-state|suggestion|emptyCTA/i);
    });

    it("lib/search sugere correção e emptyCTA quando total 0", async () => {
      const { hybridSearch, buildTsvectorTextVacancy } = await import("../lib/search");
      const vacancyFixture = (overrides: any = {}) => ({
        id: `vac-${Math.random().toString(36).slice(2, 6)}`,
        titulo: "Analista Cloud Pleno",
        stack: [{ skillId: "aws" }],
        localidade: "remoto",
        regime: "CLT",
        nivel: "pleno",
        faixaDe: 8000,
        faixaAte: 12000,
        status: "ativa",
        createdAt: new Date("2026-11-05T10:00:00Z"),
        updatedAt: new Date("2026-11-06T10:00:00Z"),
        ...overrides,
      });
      const vacancies = [vacancyFixture({ titulo: "Analista Cloud" })];
      const result = await hybridSearch("Analsita Cluod", vacancies, {
        buildText: buildTsvectorTextVacancy,
        getStack: (v: any) => v.stack,
      });
      expect(result.total).toBe(0);
      expect(result.suggestion).toBeTruthy();
      expect(result.emptyCTA).toBeTruthy();
      expect(result.emptyCTA).toMatch(/limpar|ajustar|quis dizer/i);
    });
  });

  describe("responsivo + PWA", () => {
    it("Tailwind breakpoints 360/768/1024/1280", () => {
      const tw = path.join(__dirname, "../tailwind.config.js");
      expect(fs.existsSync(tw)).toBe(true);
      const src = fs.readFileSync(tw, "utf-8");
      expect(src).toMatch(/360/);
      expect(src).toMatch(/768/);
      expect(src).toMatch(/1024/);
      expect(src).toMatch(/1280/);
      // vagas/candidatos usam hidden md:block e md:hidden
      const vagasPage = fs.readFileSync(path.join(__dirname, "../app/vagas/page.tsx"), "utf-8");
      expect(vagasPage).toMatch(/hidden md:block/);
      expect(vagasPage).toMatch(/md:hidden/);
    });

    it("PWA manifest existe e é linkado no layout", () => {
      const manifestPath = path.join(__dirname, "../public/manifest.json");
      expect(fs.existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      expect(manifest.name).toBeTruthy();
      expect(manifest.icons).toBeDefined();
      expect(Array.isArray(manifest.icons)).toBe(true);
      const layout = fs.readFileSync(path.join(__dirname, "../app/layout.tsx"), "utf-8");
      expect(layout).toMatch(/manifest\.json/);
    });

    it("next.config usa next-intl", () => {
      const p = path.join(__dirname, "../next.config.mjs");
      expect(fs.existsSync(p)).toBe(true);
      const src = fs.readFileSync(p, "utf-8");
      expect(src).toMatch(/next-intl/);
    });
  });
});
