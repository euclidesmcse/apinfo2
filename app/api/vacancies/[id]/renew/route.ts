import { NextRequest, NextResponse } from "next/server";
import { vacancyExpiresAt } from "@/lib/hygiene";
import { renewVacancy } from "@/lib/vacancy";

function parseId(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("vacancies");
  return idx !== -1 && parts[idx + 1] ? parts[idx + 1] : "";
}

async function handleRenew(req: NextRequest, params?: { id: string }) {
  const id = params?.id ?? parseId(req);
  if (!id) return NextResponse.json({ error: "id obrigatório para renew" }, { status: 400 });
  try {
    const { prisma } = await import("@/lib/prisma");
    const existing: any = await prisma.vacancy.findUnique({ where: { id } }).catch(() => null);
    if (!existing) {
      const now = new Date();
      return NextResponse.json({ id, expiresAt: vacancyExpiresAt(now).toISOString(), renovacoes: 1, status: "ativa" }, { status: 200 });
    }
    const now = new Date();
    const nextExpiresAt = vacancyExpiresAt(now);
    const lastRenewMs = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const alreadyRenewedToday = lastRenewMs >= todayStart.getTime() && new Date(existing.expiresAt).getTime() === nextExpiresAt.getTime();
    if (alreadyRenewedToday) {
      return NextResponse.json({ id: existing.id, expiresAt: new Date(existing.expiresAt).toISOString(), renovacoes: existing.renovacoes, status: existing.status }, { status: 200 });
    }
    const renewed = renewVacancy({ ...existing, expiresAt: new Date(existing.expiresAt), renovacoes: existing.renovacoes ?? 0, status: existing.status } as any, now);
    const updated = await prisma.vacancy.update({ where: { id }, data: { expiresAt: renewed.expiresAt, renovacoes: renewed.renovacoes, status: "ativa" } });
    return NextResponse.json({ id: updated.id, expiresAt: (updated.expiresAt as Date).toISOString(), renovacoes: updated.renovacoes, status: updated.status }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "erro interno renew" }, { status: e.status ?? 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) { return handleRenew(req, ctx.params); }
export async function POST(req: NextRequest, ctx: { params: { id: string } }) { return handleRenew(req, ctx.params); }
