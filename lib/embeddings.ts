/**
 * Embeddings stub — Fase 1
 * Produção usará OmniRoute multilingual-e5 (1024 dims).
 * Interface estável para Task 3/5 consumirem.
 */

export const EMBEDDING_DIM = 1024;
export const EMBEDDING_MODEL = "multilingual-e5-large";

/**
 * Gera embedding para texto. Stub retorna vetor zero 1024.
 * TODO(Task 5): substituir stub por chamada real OmniRoute multilingual-e5
 * search (hybrid pgvector + tsvector) depende de embedding real — ver Task 5.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  void text;
  return new Array(EMBEDDING_DIM).fill(0);
}

/**
 * Gera embeddings em lote.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(generateEmbedding));
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
