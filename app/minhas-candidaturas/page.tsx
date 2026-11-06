"use client";
import * as React from "react";

type AppRow = {
  id: string;
  vacancyId: string | null;
  proxyThreadId: string;
  status: "enviado" | "visualizado" | "respondido" | "arquivado";
  origem?: string;
  titulo?: string;
  companyId?: string;
  createdAt?: string;
};

const STATUS_LABEL: Record<string, string> = {
  enviado: "enviado",
  visualizado: "visualizado",
  respondido: "respondido",
  arquivado: "arquivado",
};

const STATUS_ORDER: Record<string, number> = { enviado: 0, visualizado: 1, respondido: 2, arquivado: 3 };

export default function MinhasCandidaturasPage() {
  const [items, setItems] = React.useState<AppRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [candidateId, setCandidateId] = React.useState<string>("");

  React.useEffect(() => {
    const cid = (() => {
      try {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem("apinfo:candidateId") : null;
        if (raw) return raw.replace(/"/g, "");
      } catch {}
      return "";
    })();
    if (cid) setCandidateId(cid);
  }, []);

  const fetchApps = React.useCallback(async () => {
    setLoading(true);
    try {
      const qs = candidateId ? `?candidateId=${encodeURIComponent(candidateId)}` : "";
      // tenta api batch listing; fallback para mock
      const res = await fetch(`/api/applications/batch${qs}`, { method: "GET" }).catch(() => null as any);
      let data: any = null;
      if (res && res.ok) data = await res.json().catch(() => null);
      if (data?.applications?.length) {
        setItems(data.applications);
      } else if (data?.results?.length) {
        setItems(
          data.results.map((r: any) => ({
            id: r.id ?? r.applicationId,
            vacancyId: r.vacancyId,
            proxyThreadId: r.proxyThreadId,
            status: r.status,
            origem: "candidaturaLote",
          }))
        );
      } else {
        // fallback in-memory via lib/proxy client? usa fetch dedicado se existir GET /api/applications
        const res2 = await fetch(`/api/applications${qs}`).catch(() => null as any);
        if (res2 && res2.ok) {
          const d2: any = await res2.json().catch(() => null);
          if (Array.isArray(d2?.items)) setItems(d2.items);
          else if (Array.isArray(d2?.applications)) setItems(d2.applications);
          else setItems([]);
        } else {
          setItems([]);
        }
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  React.useEffect(() => {
    if (candidateId !== undefined) fetchApps();
  }, [fetchApps, candidateId]);

  if (loading) return <main className="p-6">Carregando candidaturas...</main>;

  return (
    <main className="minhas-candidaturas p-4">
      <h1>Minhas candidaturas</h1>
      <p className="text-sm text-zinc-500">enviado &gt; visualizado &gt; respondido — via proxy {items.length} candidatura(s)</p>
      {items.length === 0 ? (
        <div role="status" className="empty">Nenhuma candidatura ainda. Vá em vagas e candidate em lote!</div>
      ) : (
        <table aria-label="minhas candidaturas">
          <thead>
            <tr>
              <th scope="col">Vaga</th>
              <th scope="col">Thread</th>
              <th scope="col">Status</th>
              <th scope="col">Progresso</th>
            </tr>
          </thead>
          <tbody>
            {items.map((app) => (
              <tr key={app.id} data-testid={`app-${app.id}`} data-status={app.status} data-proxy={app.proxyThreadId}>
                <td>{app.titulo ?? app.vacancyId ?? "—"}</td>
                <td><code>{app.proxyThreadId}</code></td>
                <td>
                  <span aria-label={`status-${app.status}`} className={`badge badge-${app.status}`}>
                    {STATUS_LABEL[app.status] ?? app.status}
                  </span>
                </td>
                <td aria-label={`progresso-${app.status}`}>
                  {["enviado", "visualizado", "respondido"].map((s) => (
                    <span key={s} data-active={STATUS_ORDER[app.status] >= STATUS_ORDER[s] ? "true" : "false"} aria-label={`etapa-${s}`}>
                      {s === app.status ? "● " : "○ "}{s}
                    </span>
                  )).reduce((acc: any, el, i) => (i === 0 ? [el] : [...acc, " › ", el]), [] as any)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Client polling via proxy webhook: status atualiza auto quando webhook chega */}
      <div className="text-xs text-zinc-400">proxy: id@via.apinfo.com — responda o e-mail para liberar contato direto</div>
    </main>
  );
}
