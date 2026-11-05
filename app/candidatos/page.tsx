"use client";
import * as React from "react";
import { CandidateTable } from "@/components/candidate-table";
import { CandidateCards } from "@/components/candidate-cards";

type Item = any;

export default function CandidatosPage() {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<Item[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [suggestion, setSuggestion] = React.useState<string | null>(null);
  const [emptyCTA, setEmptyCTA] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const fetchPage = React.useCallback(async (query: string, p: number) => {
    const params = new URLSearchParams({ q: query, page: String(p), pageSize: "20" });
    const res = await fetch(`/api/search/candidates?${params.toString()}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setSuggestion(data.suggestion ?? null);
    setEmptyCTA(data.emptyCTA ?? null);
  }, []);

  React.useEffect(() => {
    fetchPage(q, page);
  }, [q, page, fetchPage]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <main className="candidatos-page p-4">
      <h1>Candidatos</h1>
      <input aria-label="busca-candidatos" placeholder="Analista Cloud" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      {suggestion ? <div role="status" aria-label="sugestao">Você quis dizer &quot;{suggestion}&quot;?</div> : null}
      {emptyCTA ? <div role="status" aria-label="empty-cta">{emptyCTA}</div> : null}
      <div className="hidden md:block">
        <CandidateTable items={items} selectedIds={selected} onToggle={toggle} onOpenDetail={() => {}} />
      </div>
      <div className="md:hidden">
        <CandidateCards items={items} selectedIds={selected} onToggle={toggle} onOpenDetail={() => {}} />
      </div>
      <div aria-label="paginacao">
        Página {page} de {totalPages} — {total} candidatos
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</button>
      </div>
    </main>
  );
}
