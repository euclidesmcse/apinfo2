"use client";
import * as React from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { VacancyTable } from "./vacancy-table";
import { VacancyCards } from "./vacancy-cards";
import { CandidateTable } from "./candidate-table";
import { CandidateCards } from "./candidate-cards";
import { DetailModal } from "./detail-modal";
export function Directory({ kind }: { kind: "vacancies" | "candidates" }) {
  const en = useLocale() === "en", candidates = kind === "candidates";
  const title = candidates ? (en ? "Candidates" : "Candidatos") : (en ? "Vacancies" : "Vagas");
  const [q, setQ] = React.useState(""), [page, setPage] = React.useState(1);
  const [items, setItems] = React.useState<any[]>([]), [total, setTotal] = React.useState(0), [pages, setPages] = React.useState(1);
  const [ready, setReady] = React.useState(false), [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(""), [notice, setNotice] = React.useState(""), [demo, setDemo] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]), [storageKey, setStorageKey] = React.useState("");
  const [loteId, setLoteId] = React.useState("");
  const [detail, setDetail] = React.useState<any>(null), [confirm, setConfirm] = React.useState(false);
  const [subject, setSubject] = React.useState(""), [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const sendingRef = React.useRef(false);
  const closeDetail = React.useCallback(() => setDetail(null), []);
  const closeConfirm = React.useCallback(() => { if (!sendingRef.current) setConfirm(false); }, []);
  React.useEffect(() => {
    let active = true;
    setQ(new URLSearchParams(window.location.search).get("q") ?? "");
    fetch("/api/auth/me").then(async res => res.ok ? res.json() : null).catch(() => null).then(session => {
      if (!active) return;
      const owner = session?.candidate?.id ?? session?.company?.id ?? "anonymous";
      const key = "w2talent:selection:" + owner + ":" + kind;
      setStorageKey(key);
      try {
        const value = JSON.parse(localStorage.getItem(key) ?? "{}");
        setSelected(Array.isArray(value.ids) ? [...new Set<string>(value.ids.filter((id: any) => typeof id === "string"))].slice(0, 10) : []);
        setLoteId(typeof value.loteId === "string" && value.loteId ? value.loteId : crypto.randomUUID());
      } catch { setLoteId(crypto.randomUUID()); }
      setReady(true);
    });
    return () => { active = false; };
  }, [kind]);
  React.useEffect(() => {
    if (storageKey && ready) try { localStorage.setItem(storageKey, JSON.stringify({ ids: selected, loteId })); } catch {}
  }, [selected, loteId, storageKey, ready]);
  React.useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    const timer = setTimeout(async () => {
      try {
        const url = new URL(window.location.href);
        if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
        window.history.replaceState(null, "", url);
        const response = await fetch("/api/search/" + kind + "?" + new URLSearchParams({ q, page: String(page) }), { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Falha na busca");
        if (controller.signal.aborted) return;
        setItems(result.items); setTotal(result.total); setPages(result.totalPages); setDemo(result.demo === true);
      } catch (e: any) { if (!controller.signal.aborted) { setError(e.message); setItems([]); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q, page, ready, kind]);
  const toggle = (id: string) => {
    setNotice("");
    setSelected(ids => {
      if (ids.includes(id)) return ids.filter(value => value !== id);
      if (ids.length >= 10) { setNotice(en ? "Select up to 10 items." : "Selecione no máximo 10 itens."); return ids; }
      return [...ids, id];
    });
  };
  async function send() {
    if (sendingRef.current) return;
    sendingRef.current = true; setSending(true); setNotice("");
    try {
      const response = await fetch("/api/" + (candidates ? "contacts" : "applications") + "/batch", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ [candidates ? "candidateIds" : "vacancyIds"]: selected, loteId, subject, body: message }),
      });
      const result = await response.json();
      if (!response.ok && !result.results) throw new Error(result.error ?? "Falha no envio");
      const accepted = (result.results ?? []).filter((r: any) => r.status !== "error");
      const errors = (result.results ?? []).filter((r: any) => r.status === "error");
      const pending = accepted.filter((r: any) => r.status === "pendente").length;
      setNotice(en ? accepted.length + " recorded; " + pending + " pending delivery. " + errors.map((r: any) => r.error).join("; ") :
        accepted.length + " registrado(s); " + pending + " aguardando envio. " + errors.map((r: any) => r.error).join("; "));
      const ids = new Set(accepted.map((r: any) => candidates ? r.candidateId : r.vacancyId));
      setSelected(current => current.filter(id => !ids.has(id)));
      if (accepted.length) setLoteId(crypto.randomUUID());
      setConfirm(false);
    } catch (e: any) { setNotice(e.message); }
    finally { sendingRef.current = false; setSending(false); }
  }
  const tableProps = { items, selectedIds: new Set(selected), onToggle: toggle, onOpenDetail: (id: string) => setDetail(items.find(item => item.id === id)) };
  return <main className="mx-auto max-w-6xl p-4 pb-32">
    <nav className="mb-6 flex flex-wrap gap-4"><Link href="/">W²Talent</Link><Link href="/vagas">{en ? "Vacancies" : "Vagas"}</Link>
      <Link href="/candidatos">{en ? "Candidates" : "Candidatos"}</Link><Link href="/conta">{en ? "My account" : "Minha conta"}</Link>
      <Link href="/minhas-candidaturas">{en ? "Applications" : "Candidaturas"}</Link></nav>
    <h1 className="text-3xl font-semibold">{title}</h1>
    <label className="my-5 block">{en ? "Search" : "Buscar"}<input type="search" maxLength={200} aria-label={en ? "Search" : "Buscar"}
      value={q} onChange={e => { setQ(e.target.value); setPage(1); }} className="ml-3 rounded border p-3" placeholder="Cloud, React, AWS..." /></label>
    {demo && <p role="status">{en ? "Demonstration data. Sending is unavailable." : "Dados de demonstração. Envio indisponível."}</p>}
    {loading && <p role="status">{en ? "Loading…" : "Carregando…"}</p>}
    {error && <p role="alert">{error} <Link className="underline" href="/conta">{en ? "Open account" : "Acessar conta"}</Link></p>}
    {notice && <p role="status" className="my-3 rounded border p-3">{notice}</p>}
    {!loading && !error && items.length === 0 && <p>{en ? "No results. Try different search terms." : "Nenhum resultado. Ajuste a busca."}</p>}
    <div className="hidden md:block">{candidates ? <CandidateTable {...tableProps} /> : <VacancyTable {...tableProps} />}</div>
    <div className="md:hidden">{candidates ? <CandidateCards {...tableProps} /> : <VacancyCards {...tableProps} />}</div>
    <div className="mt-4 flex items-center justify-between"><button disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>{en ? "Previous" : "Anterior"}</button>
      <span>{page} / {pages} · {total}</span><button disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>{en ? "Next" : "Próxima"}</button></div>
    <DetailModal open={!!detail} onClose={closeDetail} item={detail} title={detail?.titulo} />
    <div className="fixed inset-x-0 bottom-0 flex items-center justify-center gap-4 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <span>{selected.length} / 10</span><button onClick={() => { setSelected([]); setLoteId(crypto.randomUUID()); }}>{en ? "Clear" : "Limpar"}</button>
      <button disabled={!selected.length || sending || demo} onClick={() => setConfirm(true)} className="rounded bg-black px-5 py-3 text-white disabled:opacity-40">
        {candidates ? (en ? "Contact" : "Contatar") : (en ? "Apply" : "Candidatar")} ({selected.length})</button>
    </div>
    <DetailModal open={confirm} onClose={closeConfirm} title={en ? "Confirm sending" : "Confirmar envio"}>
      <p>{en ? "Send to " : "Enviar para "}{selected.length}{en ? " selected items. Daily limit: 30." : " itens selecionados. Limite diário: 30."}</p>
      {candidates && <div className="space-y-3">
        <label className="block">{en ? "Subject" : "Assunto"}<input maxLength={200} value={subject} onChange={e => setSubject(e.target.value)} className="block w-full rounded border p-2" /></label>
        <label className="block">{en ? "Message (optional)" : "Mensagem (opcional)"}<textarea maxLength={5000} value={message} onChange={e => setMessage(e.target.value)} className="block w-full rounded border p-2" /></label>
      </div>}
      {notice && <p role="alert">{notice}</p>}
      <button disabled={sending} onClick={send} className="mt-4 rounded bg-black p-3 text-white">{sending ? (en ? "Sending…" : "Enviando…") : (en ? "Confirm" : "Confirmar")}</button>
    </DetailModal>
  </main>;
}
