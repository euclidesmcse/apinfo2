"use client";
import * as React from "react";
import { normalizeSkill } from "@/lib/taxonomy";

export type VacancyFormDraft = {
  companyId: string;
  titulo: string;
  stack: string[]; // skillIds ou raw; será normalizado
  descricaoBullets: string;
  beneficios: string;
  nivel?: string;
  regime?: string;
  localidade?: string;
  tipoContrato?: string;
  faixaDe?: number | null;
  faixaAte?: number | null;
  faixaMoeda?: string;
};

const REGIMES = ["CLT", "PJ", "Freelance", "Estágio", "Cooperado"];
const NIVEIS = ["júnior", "pleno", "sênior", "estágio", "tech lead", "staff"];

export function VacancyForm({
  initialDraft,
  onSubmit,
  submitLabel = "Publicar vaga",
}: {
  initialDraft?: Partial<VacancyFormDraft>;
  onSubmit: (draft: VacancyFormDraft) => Promise<void> | void;
  submitLabel?: string;
}) {
  const [draft, setDraft] = React.useState<VacancyFormDraft>({
    companyId: initialDraft?.companyId ?? "",
    titulo: initialDraft?.titulo ?? "",
    stack: initialDraft?.stack ?? [],
    descricaoBullets: initialDraft?.descricaoBullets ?? "",
    beneficios: initialDraft?.beneficios ?? "",
    nivel: initialDraft?.nivel ?? "",
    regime: initialDraft?.regime ?? "",
    localidade: initialDraft?.localidade ?? "",
    tipoContrato: initialDraft?.tipoContrato ?? "",
    faixaDe: initialDraft?.faixaDe ?? null,
    faixaAte: initialDraft?.faixaAte ?? null,
    faixaMoeda: initialDraft?.faixaMoeda ?? "BRL",
  });
  const [stackInput, setStackInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const update = (field: keyof VacancyFormDraft, value: any) => setDraft((p) => ({ ...p, [field]: value } as any));

  const addStackSkill = () => {
    const raw = stackInput.trim();
    if (!raw) return;
    const normalized = normalizeSkill(raw);
    if (!normalized) {
      setError(`skill não encontrada na taxonomia: "${raw}"`);
      return;
    }
    if (draft.stack.includes(normalized)) {
      setError(`skill já adicionada: ${normalized}`);
      return;
    }
    setError(null);
    setDraft((p) => ({ ...p, stack: [...p.stack, normalized] }));
    setStackInput("");
  };

  const removeStackSkill = (skillId: string) =>
    setDraft((p) => ({ ...p, stack: p.stack.filter((s) => s !== skillId) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!draft.titulo.trim()) return setError("titulo obrigatório");
    if (!draft.companyId.trim()) return setError("companyId obrigatório (empresa)");
    if (draft.faixaDe != null && Number.isNaN(Number(draft.faixaDe))) return setError("faixaDe deve ser número");
    if (draft.faixaAte != null && Number.isNaN(Number(draft.faixaAte))) return setError("faixaAte deve ser número");
    try {
      setSubmitting(true);
      await onSubmit(draft);
    } catch (err: any) {
      setError(err?.message ?? "erro ao salvar vaga");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Formulário Vaga Canônica" className="vacancy-form">
      <label>
        Company ID
        <input aria-label="companyId" value={draft.companyId} onChange={(e) => update("companyId", e.target.value)} placeholder="companyId" required />
      </label>

      <label>
        Título *
        <input aria-label="titulo" value={draft.titulo} onChange={(e) => update("titulo", e.target.value)} placeholder="Ex: Engenheiro Cloud Pleno" required maxLength={120} />
      </label>

      <label>
        Stack (taxonomia — sinônimos normalizados)
        <div className="stack-row">
          <input aria-label="stack-input" value={stackInput} onChange={(e) => setStackInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStackSkill(); } }} placeholder="Ex: AWS, React.js, Amazon Web Services" />
          <button type="button" aria-label="adicionar-skill" onClick={addStackSkill}>+ adicionar</button>
        </div>
        <div aria-label="stack-list" className="stack-list">
          {draft.stack.map((sid) => (
            <span key={sid} className="skill-chip">
              {sid} <button type="button" aria-label={`remover-${sid}`} onClick={() => removeStackSkill(sid)}>×</button>
            </span>
          ))}
        </div>
      </label>

      <fieldset>
        <legend>Faixa salarial (opcional — deixe vazio se não informar)</legend>
        <label>
          faixaDe
          <input aria-label="faixaDe" type="number" value={draft.faixaDe ?? ""} onChange={(e) => update("faixaDe", e.target.value === "" ? null : Number(e.target.value))} placeholder="8000" />
        </label>
        <label>
          faixaAte
          <input aria-label="faixaAte" type="number" value={draft.faixaAte ?? ""} onChange={(e) => update("faixaAte", e.target.value === "" ? null : Number(e.target.value))} placeholder="12000" />
        </label>
        <label>
          faixaMoeda
          <select aria-label="faixaMoeda" value={draft.faixaMoeda} onChange={(e) => update("faixaMoeda", e.target.value)}>
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
      </fieldset>

      <label>
        Nível
        <select aria-label="nivel" value={draft.nivel} onChange={(e) => update("nivel", e.target.value)}>
          <option value="">Selecione</option>
          {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>

      <label>
        Regime
        <select aria-label="regime" value={draft.regime} onChange={(e) => update("regime", e.target.value)}>
          <option value="">Selecione</option>
          {REGIMES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>

      <label>
        Localidade
        <input aria-label="localidade" value={draft.localidade} onChange={(e) => update("localidade", e.target.value)} placeholder="remoto / São Paulo" />
      </label>

      <label>
        Tipo contrato
        <input aria-label="tipoContrato" value={draft.tipoContrato ?? ""} onChange={(e) => update("tipoContrato", e.target.value)} placeholder="CLT / PJ" />
      </label>

      <label>
        Descrição (bullets — uma por linha, normalizado para array)
        <textarea aria-label="descricaoBullets" value={draft.descricaoBullets} onChange={(e) => update("descricaoBullets", e.target.value)} rows={4} placeholder="Migrar workloads para EKS&#10;Implementar CI/CD" />
      </label>

      <label>
        Benefícios (um por linha)
        <textarea aria-label="beneficios" value={draft.beneficios} onChange={(e) => update("beneficios", e.target.value)} rows={3} placeholder="Vale refeição&#10;Plano de saúde" />
      </label>

      {error ? <div role="alert" className="error">{error}</div> : null}

      <button type="submit" disabled={submitting} aria-label="publicar-vaga">
        {submitting ? "publicando..." : submitLabel}
      </button>
      <button type="button" onClick={() => setDraft({ ...draft, titulo: initialDraft?.titulo ?? "", stack: initialDraft?.stack ?? [] })}>
        Desfazer
      </button>
    </form>
  );
}

export default VacancyForm;
