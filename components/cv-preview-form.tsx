"use client";
import * as React from "react";

type StackItem = { skillId: string; nivel?: string; anos?: number };

export type CvDraftForm = {
  titulo: string;
  resumo3linhas?: string;
  localidade?: string;
  objetivoCrescimento: string;
  stack: StackItem[];
};

export function CvPreviewForm({
  initialDraft,
  onPublish,
  fallbackWarning,
}: {
  initialDraft: CvDraftForm;
  onPublish: (draft: CvDraftForm) => Promise<void> | void;
  fallbackWarning?: string;
}) {
  const [draft, setDraft] = React.useState<CvDraftForm>(initialDraft);
  const [publishing, setPublishing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // 1 tela editável — todos os campos na mesma tela
  const updateField = (field: keyof CvDraftForm, value: any) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const updateStackSkill = (idx: number, skillId: string) => {
    setDraft((prev) => {
      const next = [...prev.stack];
      next[idx] = { ...next[idx], skillId };
      return { ...prev, stack: next };
    });
  };

  const addSkill = () => {
    setDraft((prev) => ({ ...prev, stack: [...prev.stack, { skillId: "", nivel: "pleno" }] }));
  };

  const removeSkill = (idx: number) => {
    setDraft((prev) => ({ ...prev, stack: prev.stack.filter((_, i) => i !== idx) }));
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!draft.objetivoCrescimento?.trim()) {
      setError("objetivoCrescimento obrigatório");
      return;
    }
    if (draft.objetivoCrescimento.trim().length < 10) {
      setError("objetivoCrescimento muito curto (mín 10 caracteres)");
      return;
    }
    try {
      setPublishing(true);
      await onPublish(draft);
    } catch (err: any) {
      setError(err?.message ?? "erro ao publicar");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <form onSubmit={handlePublish} aria-label="Preview CV Canônico — 1 tela" className="cv-preview-form">
      {fallbackWarning ? (
        <div role="alert" className="fallback-warning">
          {fallbackWarning}
        </div>
      ) : null}

      <label>
        Título / Cargo
        <input
          aria-label="titulo"
          value={draft.titulo}
          onChange={(e) => updateField("titulo", e.target.value)}
          placeholder="Ex: Engenheiro Cloud Pleno"
        />
      </label>

      <label>
        Localidade
        <input
          aria-label="localidade"
          value={draft.localidade ?? ""}
          onChange={(e) => updateField("localidade", e.target.value)}
          placeholder="São Paulo / remoto"
        />
      </label>

      <label>
        Resumo (3 linhas)
        <textarea
          aria-label="resumo"
          value={draft.resumo3linhas ?? ""}
          onChange={(e) => updateField("resumo3linhas", e.target.value)}
          rows={3}
        />
      </label>

      <label>
        Objetivo de crescimento * (obrigatório)
        <textarea
          aria-label="objetivoCrescimento"
          value={draft.objetivoCrescimento}
          onChange={(e) => updateField("objetivoCrescimento", e.target.value)}
          placeholder="Quero crescer para Tech Lead em Cloud..."
          required
          rows={3}
        />
      </label>

      <fieldset>
        <legend>Stack — skills normalizadas (top 3 em destaque)</legend>
        {draft.stack.map((item, idx) => (
          <div key={idx} className="skill-row">
            <input
              aria-label={`skill-${idx}`}
              value={item.skillId}
              onChange={(e) => updateStackSkill(idx, e.target.value)}
              placeholder="skillId (ex: aws)"
            />
            <button type="button" onClick={() => removeSkill(idx)} aria-label={`remover-skill-${idx}`}>
              remover
            </button>
          </div>
        ))}
        <button type="button" onClick={addSkill}>
          + adicionar skill
        </button>
      </fieldset>

      {error ? (
        <div role="alert" className="error">
          {error}
        </div>
      ) : null}

      <button type="submit" disabled={publishing} aria-label="publicar">
        {publishing ? "publicando..." : "Publicar como ativo"}
      </button>
      <button type="button" onClick={() => setDraft(initialDraft)}>
        Desfazer edições
      </button>
    </form>
  );
}

export default CvPreviewForm;
