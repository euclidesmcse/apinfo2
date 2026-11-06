import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="py-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">W2Talent</h1>
        <p className="mx-auto mt-3 max-w-2xl text-zinc-600">
          Conector simples <strong>Candidatos ↔ Empresas</strong> inspirado no apinfo.com — agora em w2talent.com.
          Busca semântica, candidatura <strong>1-clique em lote (10/lote, 30/dia)</strong>, sem Outlook.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/vagas" className="rounded bg-black px-6 py-3 text-white">
            Ver vagas
          </Link>
          <Link href="/candidatos" className="rounded border px-6 py-3">
            Buscar candidatos
          </Link>
        </div>
        <p className="mt-4 text-xs text-zinc-400">
          via.w2talent.com • LGPD granular • PT-BR / EN • w2talent.com
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded border p-4">
          <h2 className="font-semibold">1. Lista limpa</h2>
          <p className="text-sm text-zinc-600">Tabela desktop / cards mobile, checkbox + lupa sem perder seleção. +2 skills truncadas.</p>
        </div>
        <div className="rounded border p-4">
          <h2 className="font-semibold">2. 1-clique em lote</h2>
          <p className="text-sm text-zinc-600">Candidatar ou contatar até 10 por vez, 30/dia. Proxy via.w2talent.com até resposta liberar contato direto.</p>
        </div>
        <div className="rounded border p-4">
          <h2 className="font-semibold">3. Higiene automática</h2>
          <p className="text-sm text-zinc-600">CV 180d / vaga 14d com 3 nudges. Sem vaga fantasma, sem CV de 2019.</p>
        </div>
      </section>

      <footer className="py-10 text-center text-xs text-zinc-400">
        Inspirado no apinfo.com • Marca própria W2Talent (w2talent.com) • Cold start do zero
      </footer>
    </main>
  );
}
