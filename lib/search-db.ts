import { prisma } from "./prisma";
import type { SearchParams, SearchResult } from "./search";
import { ApiError } from "./api";

export async function searchDatabase(kind: "candidate" | "vacancy", params: SearchParams): Promise<SearchResult<any>> {
  const started = Date.now();
  const candidate = kind === "candidate";
  const table = candidate ? '"CandidateProfile"' : '"Vacancy"';
  const q = (params.q ?? "").trim();
  if (q.length > 200) throw new ApiError("Busca limitada a 200 caracteres", 400);
  const page = Math.max(1, Math.min(10000, Math.floor(params.page || 1)));
  const pageSize = Math.max(1, Math.min(20, Math.floor(params.pageSize || 20)));
  const values: any[] = [];
  const bind = (value: unknown) => { values.push(value); return "$" + values.length; };
  const clauses = [candidate ? "t.status = 'ativo'" : "t.status = 'ativa'", 't."expiresAt" > NOW()'];
  if (candidate) clauses.push('t."tratamentoBuscaV" > 0', 't."contatoProxyV" > 0');
  const text = candidate
    ? 'concat_ws(\' \', t.titulo, t.localidade, t.modo, t.stack::text, t."resumo3linhas")'
    : 'concat_ws(\' \', t.titulo, t.localidade, t.regime, t.nivel, t.stack::text, t."descricaoBullets"::text)';
  let rank = "0";
  if (q) {
    const query = "plainto_tsquery('simple', " + bind(q) + ")";
    const vector = "to_tsvector('simple', " + text + ")";
    clauses.push(vector + " @@ " + query);
    rank = "ts_rank_cd(" + vector + ", " + query + ")";
  }
  if (params.regime) {
    if (candidate) clauses.push('EXISTS (SELECT 1 FROM unnest(t."regimePreferido") r WHERE lower(r) = lower(' + bind(params.regime) + '))');
    else clauses.push("lower(t.regime) = lower(" + bind(params.regime) + ")");
  }
  for (const key of ["localidade", "modo", "nivel"] as const) {
    const value = params[key];
    if (!value) continue;
    if (key === "nivel" && candidate) clauses.push("t.stack::text ILIKE " + bind("%" + value + "%"));
    else {
      const column = key === "modo" && !candidate ? "localidade" : key;
      clauses.push('t."' + column + '" ILIKE ' + bind("%" + value + "%"));
    }
  }
  const low = candidate ? "pretensaoDe" : "faixaDe";
  const high = candidate ? "pretensaoAte" : "faixaAte";
  for (const [value, column, operator] of [[params.faixaDe, high, ">="], [params.faixaAte, low, "<="]] as const) {
    if (value == null) continue;
    if (!Number.isSafeInteger(value) || value < 0) throw new ApiError("Faixa salarial inválida", 400);
    clauses.push('(t."' + column + '" IS NULL OR t."' + column + '" ' + operator + " " + bind(value) + ")");
  }
  const where = clauses.join(" AND ");
  const publicFields = ["id", "nome", "titulo", "localidade", "modo", "regimePreferido", "pretensaoDe", "pretensaoAte",
    "pretensaoMoeda", "disponibilidade", "stack", "status", "createdAt", "updatedAt"];
  const projection = candidate
    ? "jsonb_build_object(" + publicFields.map(key => "'" + key + "', t.\"" + key + "\"").join(", ") + ")"
    : "(to_jsonb(t) - 'embedding' - 'searchVector')";
  const countValues = [...values];
  const limit = bind(pageSize), offset = bind((page - 1) * pageSize);
  const [counts, rows] = await prisma.$transaction([
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>("SELECT COUNT(*) AS count FROM " + table + " t WHERE " + where, ...countValues),
    prisma.$queryRawUnsafe<Array<{ item: any }>>("SELECT " + projection + " AS item FROM " + table + " t WHERE " + where +
      " ORDER BY " + rank + ' DESC, t."updatedAt" DESC, t.id ASC LIMIT ' + limit + " OFFSET " + offset, ...values),
  ], { isolationLevel: "RepeatableRead" });
  const total = Number(counts[0].count);
  return { items: rows.map(row => row.item), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)),
    emptyCTA: total ? null : "Nenhum resultado. Ajuste os filtros.", tookMs: Date.now() - started };
}
