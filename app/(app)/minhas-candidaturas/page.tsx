"use client";
import * as React from "react";
import Link from "next/link";
export default function Applications() {
  const [items, setItems] = React.useState<any[]>([]), [error, setError] = React.useState(""), [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/applications/batch", { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!controller.signal.aborted) { setItems(result.applications); setError(""); }
      } catch (e: any) { if (!controller.signal.aborted) setError(e.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    refresh(); const timer = setInterval(refresh, 20000);
    return () => { clearInterval(timer); controller.abort(); };
  }, []);
  return <main className="mx-auto max-w-4xl p-6"><Link href="/vagas">← Vagas</Link><h1 className="my-6 text-3xl">Minhas candidaturas</h1>
    {loading && <p role="status">Carregando…</p>}{error && <p role="alert">{error} <Link href="/conta">Acessar conta</Link></p>}
    {!loading && !error && !items.length && <p>Nenhuma candidatura registrada.</p>}
    <ul className="space-y-4">{items.map(item => <li key={item.id} className="rounded border p-4">
      <h2>{item.vacancy?.titulo ?? "Contato direto"} — {item.company?.nome}</h2>
      <p>{({ pendente: "Aguardando envio", enviado: "Enviado", visualizado: "Visualizado", respondido: "Respondido", falha: "Falha no envio", arquivado: "Arquivado" } as any)[item.status]}</p>
    </li>)}</ul>
  </main>;
}
