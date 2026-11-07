"use client";
import * as React from "react";
import Link from "next/link";
export default function Account() {
  const [session, setSession] = React.useState<any>(null), [loading, setLoading] = React.useState(true);
  const [notice, setNotice] = React.useState(""), [busy, setBusy] = React.useState(false);
  const [vacancies, setVacancies] = React.useState<any[]>([]), [contacts, setContacts] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState<any>({});
  async function api(path: string, method = "GET", body?: unknown) {
    const response = await fetch(path, { method, headers: { "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Falha na operação");
    return result;
  }
  async function refresh() {
    try {
      const result = await api("/api/auth/me"); setSession(result); setDraft(result.candidate ?? {});
      if (result.company) {
        setVacancies((await api("/api/companies/vacancies")).items);
        setContacts((await api("/api/contacts/batch")).applications);
      }
    } catch (e: any) { setNotice(e.message); } finally { setLoading(false); }
  }
  React.useEffect(() => { refresh(); }, []);
  async function action(fn: () => Promise<unknown>) {
    setBusy(true); setNotice("");
    try { await fn(); setNotice("Salvo com sucesso."); await refresh(); }
    catch (e: any) { setNotice(e.message); } finally { setBusy(false); }
  }
  function field(name: string, label: string, value = "", type = "text", required = false) {
    return <label className="block">{label}<input name={name} type={type} defaultValue={value} required={required} maxLength={2000}
      className="mt-1 block w-full rounded border p-2" /></label>;
  }
  if (loading) return <main className="p-6">Carregando conta…</main>;
  if (!session) return <main className="mx-auto max-w-xl p-6"><Link href="/">← W²Talent</Link><h1 className="my-6 text-3xl">Minha conta</h1>
    <p>O login por celular ainda está indisponível. O serviço de envio de SMS precisa ser configurado para confirmar seu número.</p>
    <p className="mt-4">Nenhum código foi enviado. Assim que o serviço estiver ativo, você poderá cadastrar seu currículo ou sua empresa.</p>
    <Link className="mt-6 block underline" href="/vagas">Consultar vagas</Link></main>;
  return <main className="mx-auto max-w-3xl space-y-8 p-6">
    <nav className="flex gap-4"><Link href="/">W²Talent</Link><Link href="/vagas">Vagas</Link><Link href="/candidatos">Candidatos</Link>
      <button disabled={busy} onClick={() => action(async () => { await api("/api/auth/me", "DELETE");
        for (const key of Object.keys(localStorage)) if (key.startsWith("w2talent:selection") || key === "w2talent:loteId") localStorage.removeItem(key);
        window.location.assign("/"); })}>Sair</button></nav>
    <h1 className="text-3xl">Minha conta</h1>{notice && <p role="status" className="rounded border p-3">{notice}</p>}
    <section><h2 className="mb-4 text-2xl">Meu currículo</h2>
      <form key={JSON.stringify(draft)} className="space-y-4" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget);
        action(async () => {
          const canonico = { ...draft, nome: form.get("nome"), titulo: form.get("titulo"), email: form.get("email"),
            celular: session.userId, objetivoCrescimento: form.get("objetivoCrescimento"), resumo3linhas: form.get("resumo3linhas"),
            localidade: form.get("localidade"), stack: String(form.get("skills") ?? "").split(",").map(s => s.trim()).filter(Boolean).map(skillId => ({ skillId })) };
          await api("/api/candidates/" + encodeURIComponent(session.userId), "PUT", { canonico,
            consentimentos: { tratamentoBusca: form.has("tratamentoBusca"), contatoProxy: form.has("contatoProxy"), nudges: form.has("nudges"), iaReescrita: form.has("iaReescrita") } });
        });
      }}>
        {field("nome", "Nome", draft.nome, "text", true)}{field("titulo", "Título profissional", draft.titulo, "text", true)}
        {field("email", "E-mail", draft.email, "email", true)}{field("localidade", "Localidade", draft.localidade)}
        {field("resumo3linhas", "Resumo", draft.resumo3linhas)}{field("objetivoCrescimento", "Objetivo profissional", draft.objetivoCrescimento, "text", true)}
        {field("skills", "Habilidades, separadas por vírgula", (draft.stack ?? []).map((s: any) => s.skillId ?? s).join(", "))}
        <fieldset className="space-y-3"><legend>Privacidade</legend>
          <label className="block"><input type="checkbox" name="tratamentoBusca" required defaultChecked={draft.tratamentoBuscaV > 0} /> Permito tratamento do perfil para busca de oportunidades.</label>
          <label className="block"><input type="checkbox" name="contatoProxy" required defaultChecked={draft.contatoProxyV > 0} /> Permito contato intermediado e liberação do contato direto quando eu responder.</label>
          <label className="block"><input type="checkbox" name="nudges" defaultChecked={draft.nudgesV > 0} /> Quero receber lembretes de atualização (opcional).</label>
          <label className="block"><input type="checkbox" name="iaReescrita" defaultChecked={draft.iaReescritaV > 0} /> Permito processamento por IA (opcional).</label>
        </fieldset>
        <button disabled={busy} className="rounded bg-black p-3 text-white">Publicar ou renovar currículo</button>
      </form>
    </section>
    <section><h2 className="mb-4 text-2xl">Minha empresa</h2><form key={session.company?.updatedAt} className="space-y-4" onSubmit={event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      action(() => api("/api/companies", "POST", { nome: form.get("nome"), email: form.get("email") }));
    }}>
      {field("nome", "Nome da empresa", session.company?.nome, "text", true)}{field("email", "E-mail para candidaturas", session.company?.email, "email", true)}
      <button disabled={busy} className="rounded border p-3">Salvar empresa</button>
    </form></section>
    {session.company && <section><h2 className="mb-4 text-2xl">Publicar vaga</h2><form className="space-y-4" onSubmit={event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      action(() => api("/api/vacancies", "POST", { titulo: form.get("titulo"), localidade: form.get("localidade"), regime: form.get("regime"),
        descricaoBullets: String(form.get("descricao") ?? "").split("\n"), stack: String(form.get("stack") ?? "").split(",").map(s => s.trim()).filter(Boolean) }));
    }}>
      {field("titulo", "Título da vaga", "", "text", true)}{field("localidade", "Localidade / remoto")}{field("regime", "Regime (CLT, PJ...)")}
      {field("stack", "Habilidades, separadas por vírgula")}<label className="block">Descrição<textarea name="descricao" required maxLength={10000} className="block w-full rounded border p-2" /></label>
      <button disabled={busy} className="rounded bg-black p-3 text-white">Publicar vaga por 14 dias</button>
    </form><h3 className="my-5 text-xl">Minhas vagas</h3><ul className="space-y-3">{vacancies.map(v => <li key={v.id} className="rounded border p-3">{v.titulo} — {v.status}
      <button disabled={busy} className="ml-4 underline" onClick={() => action(() => api("/api/vacancies/" + v.id + "/renew", "POST"))}>Renovar</button>
      <button disabled={busy} className="ml-4 underline" onClick={() => action(() => api("/api/vacancies/" + v.id, "DELETE"))}>Arquivar</button>
    </li>)}</ul></section>}
    {session.company && <section><h2 className="mb-4 text-2xl">Contatos e candidaturas recebidas</h2><ul className="space-y-3">{contacts.map(contact =>
      <li key={contact.id} className="rounded border p-3">{contact.candidate.nome} — {contact.status}
        {contact.candidate.email && <p>{contact.candidate.email} · {contact.candidate.celular}</p>}</li>)}</ul></section>}
  </main>;
}
