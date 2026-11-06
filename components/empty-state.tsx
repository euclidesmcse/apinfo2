"use client";
import * as React from "react";
import { useLocale } from "next-intl";
import { t } from "@/i18n";

/**
 * EmptyState — empty state busca 0 mostra sugestão IA + CTA
 * - exibe emptyTitle/emptyBody
 * - se suggestion presente: "Você quis dizer ..." + botão ver sugestão
 * - CTA "Limpar filtros" / "Ver todas as vagas"
 * - a11y: role=status, aria-live polite
 * - radix vaul não necessário aqui; mas breakpoints 360/768/1024/1280 via tailwind
 */
export type EmptyStateProps = {
  query?: string;
  suggestion?: string | null;
  emptyCTA?: string | null;
  variant?: "vagas" | "candidatos";
  onClearFilters?: () => void;
  onUseSuggestion?: (suggestion: string) => void;
};

export function EmptyState({ query, suggestion, emptyCTA, variant = "vagas", onClearFilters, onUseSuggestion }: EmptyStateProps) {
  const locale = (() => {
    try { return useLocale(); } catch { return "pt-BR"; }
  })() as string;

  // next-intl t com fallback pt-BR
  const titleKey = variant === "candidatos" ? "candidatos.emptyTitle" : "vagas.emptyTitle";
  const bodyKey = variant === "candidatos" ? "candidatos.emptyBody" : "vagas.emptyBody";
  const title = t(locale, titleKey);
  const body = t(locale, bodyKey);
  const ctaLabel = t(locale, variant === "candidatos" ? "empty.ctaCandidatos" : "empty.ctaVagas");
  const suggestionPrefix = t(locale, "empty.suggestion", suggestion ? { suggestion } : undefined);
  const noResults = query ? t(locale, "empty.noResults", { query }) : "";
  const tryAdjust = t(locale, "empty.tryAdjust");

  return (
    <div role="status" aria-live="polite" aria-label="empty-state" data-testid="empty-state" className="empty-state py-8 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600">{body}</p>
      {query ? <p className="mt-1 text-sm text-zinc-600">Nenhum resultado para &quot;{query}&quot;.</p> : null}
      {suggestion ? (
        <div className="mt-3">
          <p aria-label="sugestao" className="text-sm">
            <span aria-label="sugestão IA" className="font-medium">Sugestão IA:</span> {suggestionPrefix}
          </p>
          <button
            type="button"
            aria-label="usar sugestão IA"
            onClick={() => onUseSuggestion?.(suggestion)}
            className="mt-2 rounded border px-3 py-1 text-sm"
          >
            Ver &quot;{suggestion}&quot;
          </button>
        </div>
      ) : null}
      <p className="mt-2 text-sm text-zinc-500">{emptyCTA ?? tryAdjust}</p>
      <button
        type="button"
        aria-label="limpar filtros"
        onClick={() => onClearFilters?.()}
        className="mt-4 rounded bg-black px-4 py-2 text-sm text-white"
      >
        {ctaLabel}
      </button>
      {/* hidden CTA text for test: emptyCTA presence */}
      {emptyCTA ? <span data-testid="empty-cta" className="sr-only">{emptyCTA}</span> : null}
      {suggestion ? <span data-testid="suggestion" className="sr-only">{suggestion}</span> : null}
      <style>{`@media (max-width: 360px) { .empty-state { padding: 1rem; } }`}</style>
    </div>
  );
}

export default EmptyState;
