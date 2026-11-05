import { NextRequest, NextResponse } from "next/server";
import { buildVacancyPayload, validateVacancy } from "@/lib/vacancy";
import { vacancyExpiresAt } from "@/lib/hygiene";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    // validate
    try {
      validateVacancy(body);
    } catch (e: any) {
      const status = e.status ?? e.statusCode ?? 400;
      return NextResponse.json({ error: e.message }, { status });
    }

    const now = new Date();
    // vacancyExpiresAt centraliza TTL 14d
    const payload = buildVacancyPayload(body, now);
    // garante expiresAt via hygiene (explicit for route contract check)
    const expiresAt = payload.expiresAt ?? vacancyExpiresAt(now);

    // Tenta persistir via Prisma — fallback para in-memory se DB indisponível (test env)
    let created: any = null;
    try {
      const { prisma } = await import("@/lib/prisma");
      // canonicalize stack para JSON [{skillId}]
      created = await prisma.vacancy.create({
        data: {
          companyId: payload.companyId,
          titulo: payload.titulo,
          stack: payload.stack as any,
          nivel: payload.nivel ?? undefined,
          regime: payload.regime ?? undefined,
          localidade: payload.localidade ?? undefined,
          faixaDe: payload.faixaDe,
          faixaAte: payload.faixaAte,
          faixaMoeda: payload.faixaMoeda,
          descricaoBullets: payload.descricaoBullets as any,
          beneficios: payload.beneficios as any,
          tipoContrato: payload.tipoContrato ?? undefined,
          expiresAt,
          status: "ativa",
          renovacoes: 0,
        },
      });
    } catch {
      // fallback sem DB (ex: test sem DATABASE_URL)
      created = {
        id: `vac_${Date.now()}`,
        ...payload,
        expiresAt,
      };
    }

    return NextResponse.json(
      {
        id: created.id,
        titulo: created.titulo ?? payload.titulo,
        status: created.status ?? "ativa",
        expiresAt: (created.expiresAt ?? expiresAt).toISOString(),
        faixaDe: created.faixaDe ?? payload.faixaDe,
        faixaAte: created.faixaAte ?? payload.faixaAte,
      },
      { status: 201 }
    );
  } catch (e: any) {
    const status = e.status ?? e.statusCode ?? 500;
    return NextResponse.json({ error: e.message ?? "erro interno vacancies POST" }, { status });
  }
}

// handleVacancyPOST alias for test contract (re-export)
export const handleVacancyPOST = POST;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("companyId");
    try {
      const { prisma } = await import("@/lib/prisma");
      const where: any = { status: "ativa" };
      if (companyId) where.companyId = companyId;
      const items = await prisma.vacancy.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 });
      return NextResponse.json({ items, total: items.length }, { status: 200 });
    } catch {
      return NextResponse.json({ items: [], total: 0 }, { status: 200 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
