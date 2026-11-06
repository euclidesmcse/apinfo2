"use client";
import * as React from "react";
import { VacancyTable } from "@/components/vacancy-table";
import { VacancyCards } from "@/components/vacancy-cards";
import { DetailModal } from "@/components/detail-modal";
import { BatchBar } from "@/components/batch-bar";
import { EmptyState } from "@/components/empty-state";
import { selectionStore } from "@/lib/selection-store";

type Item = any;

export default function VagasPage() {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<Item[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [suggestion, setSuggestion] = React.useState<string | null>(null);
  const [emptyCTA, setEmptyCTA] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string[]>(() => {
    try { return selectionStore.getState().selectedIds ?? []; } catch { return []; }
  });
  const [modalItem, setModalItem] = React.useState<Item | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const triggerRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const [activeTrigger, setActiveTrigger] = React.useState<React.RefObject<HTMLElement | null> | undefined>(undefined);

  React.useEffect(() => {
    const sync = () => { try { setSelected([...selectionStore.getState().selectedIds]); } catch {} };
    sync();
    const unsub = selectionStore.subscribe?.(sync);
    return () => { try { (unsub as any)?.(); } catch {} };
  }, []);

  const getLang = () => {
    try {
      const seg = window.location.pathname.split("/").filter(Boolean)[0];
      if (seg === "en") return "en";
      const sp = new URLSearchParams(window.location.search);
      return sp.get("lang") ?? "pt-BR";
    } catch { return "pt-BR"; }
  };

  const fetchPage = React.useCallback(async (query: string, p: number) => {
    const lang = getLang();
    const params = new URLSearchParams({ q: query, page: String(p), pageSize: "20", lang });
    const res = await fetch(`/api/search/vacancies?${params.toString()}`);
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

  const handleClearFilters = () => {
    setQ("");
    setPage(1);
    fetchPage("", 1);
  };

  const handleUseSuggestion = (s: string) => {
    setQ(s);
    setPage(1);
    fetchPage(s, 1);
  };

  const toggle = (id: string) => {
    const res = selectionStore.toggle(id);
    setSelected([...selectionStore.getState().selectedIds]);
    void res;
  };

  const openDetail = (id: string) => {
    const item = items.find((x) => x.id === id) ?? null;
    setModalItem(item);
    setModalOpen(true);
    const btn = triggerRefs.current.get(id);
    if (btn) {
      const ref = { current: btn } as React.RefObject<HTMLElement | null>;
      setActiveTrigger(ref);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const selectedSet = React.useMemo(() => new Set(selected), [selected]);
  const isEmpty = items.length === 0;

  return (
    <main className="vagas-page p-4 pb-24">
      <h1>Vagas</h1>
      <input aria-label="busca-vagas" placeholder="Analista Cloud remoto" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      {suggestion ? <div role="status" aria-label="sugestao">Você quis dizer &quot;{suggestion}&quot;?</div> : null}
      {emptyCTA ? <div role="status" aria-label="empty-cta">{emptyCTA}</div> : null}
      {isEmpty ? (
        <EmptyState query={q} suggestion={suggestion} emptyCTA={emptyCTA} variant="vagas" onClearFilters={handleClearFilters} onUseSuggestion={handleUseSuggestion} />
      ) : null}
      <div className="hidden md:block">
        <VacancyTable items={items} selectedIds={selectedSet} onToggle={toggle} onOpenDetail={openDetail} />
      </div>
      <div className="md:hidden">
        <VacancyCards items={items} selectedIds={selectedSet} onToggle={toggle} onOpenDetail={openDetail} />
      </div>
      <div aria-label="paginacao">
        Página {page} de {totalPages} — {total} vagas
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</button>
      </div>
      <DetailModal open={modalOpen} onClose={closeModal} item={modalItem} triggerRef={activeTrigger} title={modalItem?.titulo ?? "Detalhes da vaga"} />
      <BatchBar variant="vagas" onAction={(ids) => { void ids; }} />
      <span aria-hidden className="hidden">{items.map((it) => <button key={it.id} ref={(el) => { if (el) triggerRefs.current.set(it.id, el); }} aria-label={`lupa-${it.id}`} onClick={() => openDetail(it.id)} />)}</span>
    </main>
  );
}
