export const locales = ["pt-BR", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pt-BR";
export const localePrefix = "as-needed" as const;

// ── helpers usados por testes e por lib/search ───────────────────────
export function isValidLocale(loc: string | null | undefined): loc is Locale {
  return !!loc && (locales as readonly string[]).includes(loc);
}

export function getLocaleFromPath(pathname: string): Locale {
  if (!pathname) return defaultLocale;
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg === "en" || seg === "en-US") return "en";
  if (seg === "pt-BR" || seg === "pt") return "pt-BR";
  return defaultLocale;
}

export function stripLocale(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg === "en" || seg === "pt-BR") {
    const rest = "/" + pathname.split("/").filter(Boolean).slice(1).join("/");
    return rest === "/" ? "/" : rest;
  }
  return pathname;
}

// mensagens carregadas sync para testes (Node, sem import dinâmico async)
let _ptBR: Record<string, unknown> | null = null;
let _en: Record<string, unknown> | null = null;
function loadSync(locale: Locale): Record<string, unknown> {
  if (locale === "pt-BR") {
    if (!_ptBR) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        _ptBR = require("../messages/pt-BR.json");
      } catch {
        _ptBR = {};
      }
    }
    return _ptBR!;
  }
  if (!_en) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _en = require("../messages/en.json");
    } catch {
      _en = {};
    }
  }
  return _en!;
}

function getNested(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/**
 * t — tradução com fallback PT-BR quando chave falta.
 * Uso: t('pt-BR', 'vagas.title') | t('en','vagas.title')
 */
export function t(locale: string, keyPath: string, vars?: Record<string, string | number>): string {
  const loc = isValidLocale(locale) ? (locale as Locale) : defaultLocale;
  const primary = loadSync(loc);
  let val = getNested(primary, keyPath);
  if (val === undefined && loc !== defaultLocale) {
    val = getNested(loadSync(defaultLocale), keyPath);
  }
  if (val === undefined) return keyPath;
  if (typeof val !== "string") return String(val);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      val = (val as string).replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return val as string;
}

export function hasKey(locale: string, keyPath: string): boolean {
  const loc = isValidLocale(locale) ? (locale as Locale) : defaultLocale;
  return getNested(loadSync(loc), keyPath) !== undefined;
}

/**
 * hasFallback — true se en não tem chave mas pt-BR tem (fallback funciona)
 */
export function hasFallback(keyPath: string): boolean {
  return getNested(loadSync("en"), keyPath) === undefined && getNested(loadSync("pt-BR"), keyPath) !== undefined;
}

// ── formatação moeda/data por locale ─────────────────────────────────
export function formatCurrency(value: number, locale: string = defaultLocale, currency = "BRL"): string {
  const loc = isValidLocale(locale) ? locale : defaultLocale;
  const intlLocale = loc === "en" ? "en-US" : "pt-BR";
  return new Intl.NumberFormat(intlLocale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function formatCurrencyWithLocale(
  faixaDe: number | null | undefined,
  faixaAte: number | null | undefined,
  locale: string = defaultLocale,
  currency = "BRL"
): string {
  if (faixaDe == null && faixaAte == null) return "—";
  if (faixaDe != null && faixaAte != null)
    return `${formatCurrency(faixaDe, locale, currency)} – ${formatCurrency(faixaAte, locale, currency)}`;
  if (faixaDe != null) return `a partir de ${formatCurrency(faixaDe, locale, currency)}`;
  return `até ${formatCurrency(faixaAte!, locale, currency)}`;
}

export function formatDateByLocale(date: Date | string | null | undefined, locale: string = defaultLocale): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";
  const loc = isValidLocale(locale) ? locale : defaultLocale;
  const intlLocale = loc === "en" ? "en-US" : "pt-BR";
  // PT-BR: dd/mm/yyyy, EN: mm/dd/yyyy
  return new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export function formatTempoByLocale(date: Date | string | null | undefined, locale: string = defaultLocale): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const isEn = locale === "en";
  if (diffDays <= 0) return isEn ? "today" : "hoje";
  if (diffDays === 1) return isEn ? "1 day ago" : "há 1 dia";
  if (diffDays < 7) return isEn ? `${diffDays} days ago` : `há ${diffDays} dias`;
  if (diffDays < 30) return isEn ? `${Math.floor(diffDays / 7)} weeks ago` : `há ${Math.floor(diffDays / 7)} sem`;
  return isEn ? `${Math.floor(diffDays / 30)} months ago` : `há ${Math.floor(diffDays / 30)} meses`;
}

// next-intl routing config export for middleware
export const routing = {
  locales: [...locales],
  defaultLocale,
  localePrefix,
};

// embedding lang passthrough helper
export function getEmbeddingLang(locale: string): string {
  return isValidLocale(locale) ? locale : defaultLocale;
}
