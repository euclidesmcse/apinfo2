import { NextRequest, NextResponse } from "next/server";
import { renewVacancy, isVacancyExpired, validateVacancy, normalizeVacancyStack, normalizeDescricaoBullets } from "@/lib/vacancy";
import { vacancyExpiresAt } from "@/lib/hygiene";

function parseIdFromUrl(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  // .../api/vacancies/[id] or .../api/vacancies/[id]/renew
  const vacIdx = parts.indexOf("vacancies");
  if (vacIdx !== -1 && parts[vacIdx + 1]) return parts[vacIdx + 1];
  return "";
}

export async function GET(req: NextRequest, ctx?: { params: { id: string } }) {
  const id = ctx?.params?.id ?? parseIdFromUrl(req);
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  try {
    const { prisma } = await import("@/lib/prisma");
    const vac = await prisma.vacancy.findUnique({ where: { id } });
    if (!vac) return NextResponse.json({ error: "vaga não encontrada" }, { status: 404 });
    return NextResponse.json({ ...vac, expiresAt: (vac.expiresAt as Date).toISOString?.() ?? vac.expiresAt }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx?: { params: { id: string } }) {
  const url = new URL(req.url);
  const id = ctx?.params?.id ?? parseIdFromUrl(req);
  const isRenew = url.pathname.endsWith("/renew") || url.searchParams.get("action") === "renew";
  let body: any = {};
  try { body = await req.json().catch(() => ({})); } catch {}
  const wantRenew = isRenew || body.action === "renew" || body.renew === true;

  if (!wantRenew) {
    return NextResponse.json({ error: "use PATCH com {action:'renew'} para renovar" }, { status: 400 });
  }

  if (!id) return NextResponse.json({ error: "id obrigatório para renew" }, { status: 400 });

  try {
    const { prisma } = await import("@/lib/prisma");
    const existing: any = await prisma.vacancy.findUnique({ where: { id } }).catch(() => null);
    if (!existing) {
      // fallback sem DB: simula renew idempotente
      const now = new Date();
      const expiresAt = vacancyExpiresAt(now);
      return NextResponse.json({ id, expiresAt: expiresAt.toISOString(), renovacoes: 1, status: "ativa" }, { status: 200 });
    }

    const now = new Date();
    const nextExpiresAt = vacancyExpiresAt(now);

    // idempotência DB: se já foi renovado neste mesmo dia e expiresAt já é next, não incrementa de novo
    // Heuristic: se updatedAt é hoje e expiresAt já equals next, retorna sem incrementar
    const lastRenewMs = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const alreadyRenewedToday = lastRenewMs >= todayStart.getTime() && new Date(existing.expiresAt).getTime() === nextExpiresAt.getTime();
    if (alreadyRenewedToday) {
      return NextResponse.json(
        { id: existing.id, expiresAt: new Date(existing.expiresAt).toISOString(), renovacoes: existing.renovacoes, status: existing.status },
        { status: 200 }
      );
    }

    // usa helper renewVacancy para cálculo consistente (expiresAt +14d, renovacoes+1, ativa)
    const helperInput: any = {
      ...existing,
      expiresAt: new Date(existing.expiresAt),
      renovacoes: existing.renovacoes ?? 0,
      status: existing.status,
      _lastRenewAt: existing.updatedAt ? new Date(existing.updatedAt) : undefined,
    };
    const renewed = renewVacancy(helperInput, now);

    const updated = await prisma.vacancy.update({
      where: { id },
      data: {
        expiresAt: renewed.expiresAt,
        renovacoes: renewed.renovacoes,
        status: "ativa",
      },
    });

    return NextResponse.json(
      { id: updated.id, expiresAt: (updated.expiresAt as Date).toISOString(), renovacoes: updated.renovacoes, status: updated.status },
      { status: 200 }
    );
  } catch (e: any) {
    const status = e.status ?? e.statusCode ?? 500;
    return NextResponse.json({ error: e.message ?? "erro interno renew" }, { status });
  }
}

export async function PUT(req: NextRequest, ctx?: { params: { id: string } }) {
  const id = ctx?.params?.id ?? parseIdFromUrl(req);
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "payload inválido" }, { status: 400 }); }

  // validação canônica parcial
  if (body.titulo !== undefined && !String(body.titulo).trim()) {
    return NextResponse.json({ error: "titulo obrigatório" }, { status: 400 });
  }
  if (body.stack !== undefined) {
    const ids = normalizeVacancyStack(body.stack);
    body.stack = ids.map((skillId) => ({ skillId }));
  }
  if (body.descricaoBullets !== undefined || body.descricao !== undefined) {
    body.descricaoBullets = normalizeDescricaoBullets(body.descricaoBullets ?? body.descricao);
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const updated = await prisma.vacancy.update({
      where: { id },
      data: {
        titulo: body.titulo ?? undefined,
        stack: body.stack ?? undefined,
        descricaoBullets: body.descricaoBullets ?? undefined,
        beneficios: body.beneficios ? (normalizeDescricaoBullets(body.beneficios) as any) : undefined,
        nivel: body.nivel ?? undefined,
        regime: body.regime ?? undefined,
        localidade: body.localidade ?? undefined,
        faixaDe: body.faixaDe ?? undefined,
        faixaAte: body.faixaAte ?? undefined,
        faixaMoeda: body.faixaMoeda ?? undefined,
        tipoContrato: body.tipoContrato ?? undefined,
      },
    });
    return NextResponse.json({ id: updated.id, ...updated }, { status: 200 });
  } catch (e: any) {
    const status = e.status ?? e.statusCode ?? 500;
    return NextResponse.json({ error: e.message ?? "erro ao atualizar vaga" }, { status });
  }
}

export async function DELETE(req: NextRequest, ctx?: { params: { id: string } }) {
  const id = ctx?.params?.id ?? parseIdFromUrl(req);
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.vacancy.update({ where: { id }, data: { status: "arquivada" } });
    return NextResponse.json({ id, status: "arquivada" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "erro ao arquivar" }, { status: 500 });
  }
}
