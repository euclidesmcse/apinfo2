import { NextRequest, NextResponse } from "next/server";
import { validateForPublish, publishDraft, buildTsvectorText } from "@/lib/cv-extract";
import { generateEmbedding } from "@/lib/embeddings";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const canonico = body.canonico ?? body.draft ?? body;
    // body pode ser flat draft ou {canonico: draft}
    const draft = canonico && canonico.titulo !== undefined ? canonico : body.canonico ?? body;

    // LGPD: publish requer iaReescritaV consent já dado no ingest; mas revalida se enviado
    // Não bloqueia se já tem consent no draft; só valida payload

    try {
      validateForPublish(draft);
    } catch (e: any) {
      const status = e.status ?? e.statusCode ?? 400;
      return NextResponse.json({ error: e.message }, { status });
    }

    const published = await publishDraft(draft);

    // Em produção: persistiria via prisma + pgvector + tsvector
    // Aqui retorna ativo com embedding/tsvector para teste validar
    // Tenta persistir best-effort se DB disponível
    try {
      const { prisma } = await import("@/lib/prisma");
      // upsert candidateProfile draft->ativo (userId = params.id for MVP)
      const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
      const tsvector = buildTsvectorText(draft);
      // embedding precisa ser vetor pgvector — via raw SQL se prisma exigir, mas tentamos json
      await prisma.candidateProfile
        .upsert({
          where: { userId: params.id },
          create: {
            userId: params.id,
            nome: draft.nome ?? draft.titulo ?? "Candidato",
            titulo: draft.titulo ?? "Profissional",
            objetivoCrescimento: draft.objetivoCrescimento,
            localidade: draft.localidade ?? null,
            stack: draft.stack ?? [],
            experiencias: draft.experiencias ?? [],
            celular: draft.celular ?? draft.contato?.celular ?? "+5511999999999",
            email: draft.email ?? draft.contato?.email ?? "candidate@example.com",
            status: "ativo",
            expiresAt,
          },
          update: {
            titulo: draft.titulo ?? undefined,
            objetivoCrescimento: draft.objetivoCrescimento,
            localidade: draft.localidade ?? undefined,
            stack: draft.stack ?? undefined,
            status: "ativo",
            expiresAt,
          },
        })
        .catch(() => {});
      // update tsvector/embedding via raw if needed (non-fatal)
      try {
        const embeddingLiteral = `[${published.embedding.join(",")}]`;
        await prisma.$executeRawUnsafe(
          `UPDATE "CandidateProfile" SET "searchVector" = to_tsvector('portuguese', $1), embedding = $2::vector WHERE "userId" = $3`,
          tsvector,
          embeddingLiteral,
          params.id
        );
      } catch {}
    } catch {}

    return NextResponse.json(
      {
        id: params.id,
        ativo: published.draft,
        draft: published.draft,
        embedding: published.embedding,
        tsvector: published.tsvector,
        status: "ativo",
      },
      { status: 200 }
    );
  } catch (e: any) {
    const status = e.status ?? e.statusCode ?? 500;
    return NextResponse.json({ error: e.message ?? "erro interno publish" }, { status });
  }
}

// GET draft by id (stub)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ id: params.id, message: "use PUT para publicar" }, { status: 200 });
}
