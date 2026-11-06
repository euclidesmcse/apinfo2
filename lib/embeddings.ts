/**
 * Embeddings stub — Fase 1
 * Produção usará OmniRoute multilingual-e5 (1024 dims).
 * Interface estável para Task 3/5 consumirem.
 */

export const EMBEDDING_DIM = 1024;
export const EMBEDDING_MODEL = "multilingual-e5-large";

/**
 * Gera embedding para texto. Stub retorna vetor zero 1024.
 * Produção: OmniRoute multilingual-e5 — lang no embedding query (Task 10).
 * @param lang - locale lang para embedding multilíngue (pt-BR/en), usado por /api/search?lang=...
 */
export async function generateEmbedding(text: string, opts?: { lang?: string }): Promise<number[]> {
  void text;
  void opts?.lang;
  // lang passthrough para multilingual-e5: query prefix "query: {text}" com lang hint
  return new Array(EMBEDDING_DIM).fill(0);
}

/**
 * Gera embeddings em lote.
 */
export async function generateEmbeddings(texts: string[], opts?: { lang?: string }): Promise<number[][]> {
  void opts?.lang;
  return Promise.all(texts.map((t) => generateEmbedding(t, opts)));
}

/**
 * Similaridade cosseno entre dois vetores.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("vetores com dimensões diferentes");
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
