import { NextResponse } from "next/server";
import { buildVacancyPayload, renewIdempotent } from "@/lib/vacancy";
import { prisma } from "@/lib/prisma";
import { ApiError, assertOrigin, errorResponse, readJson, requireCompany } from "@/lib/api";
type Context = { params: Promise<{ id: string }> };
export async function GET(_req: Request, ctx: Context) {
  try {
    const { id } = await ctx.params;
    const vacancy = await prisma.vacancy.findFirst({ where: { id, status: "ativa", expiresAt: { gt: new Date() } } });
    if (!vacancy) throw new ApiError("Vaga não encontrada", 404);
    return NextResponse.json(vacancy);
  } catch (error) { return errorResponse(error); }
}
export async function PUT(req: Request, ctx: Context) {
  try {
    const company = await requireCompany(req);
    const { id } = await ctx.params;
    const body = await readJson(req);
    const existing = await prisma.vacancy.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new ApiError("Vaga não encontrada", 404);
    if (body.companyId && body.companyId !== company.id) throw new ApiError("Empresa não autorizada", 403);
    const payload = buildVacancyPayload({ ...existing, ...body, companyId: company.id });
    const updated = await prisma.vacancy.update({ where: { id }, data: {
      titulo: payload.titulo, stack: payload.stack, descricaoBullets: payload.descricaoBullets,
      beneficios: payload.beneficios, nivel: payload.nivel, regime: payload.regime, localidade: payload.localidade,
      faixaDe: payload.faixaDe, faixaAte: payload.faixaAte, faixaMoeda: payload.faixaMoeda, tipoContrato: payload.tipoContrato,
    } });
    return NextResponse.json(updated);
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(req: Request, ctx: Context) {
  try {
    assertOrigin(req);
    const company = await requireCompany(req);
    const { id } = await ctx.params;
    const vacancy = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Vacancy" WHERE id = ${id} FOR UPDATE`;
      const existing = await tx.vacancy.findFirst({ where: { id, companyId: company.id } });
      if (!existing) throw new ApiError("Vaga não encontrada", 404);
      const { alreadyRenewed, renewed } = renewIdempotent(existing);
      if (alreadyRenewed) return existing;
      return tx.vacancy.update({ where: { id }, data: { expiresAt: renewed!.expiresAt, renovacoes: { increment: 1 }, status: "ativa" } });
    });
    return NextResponse.json(vacancy);
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(req: Request, ctx: Context) {
  try {
    assertOrigin(req);
    const company = await requireCompany(req);
    const { id } = await ctx.params;
    const result = await prisma.vacancy.updateMany({ where: { id, companyId: company.id }, data: { status: "arquivada" } });
    if (!result.count) throw new ApiError("Vaga não encontrada", 404);
    return NextResponse.json({ id, status: "arquivada" });
  } catch (error) { return errorResponse(error); }
}
