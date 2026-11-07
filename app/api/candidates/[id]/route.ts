import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { validateForPublish } from "@/lib/cv-extract";
import { prisma } from "@/lib/prisma";
import { ApiError, errorResponse, readJson, textField, emailField } from "@/lib/api";
type Context = { params: Promise<{ id: string }> };
export async function PUT(req: Request, ctx: Context) {
  try {
    const { userId } = requireAuth(req);
    const { id } = await ctx.params;
    if (id !== userId) throw new ApiError("Perfil não autorizado", 403);
    const body = await readJson(req);
    const draft = body.canonico ?? body.draft ?? body;
    validateForPublish(draft);
    if (draft.celular !== userId) throw new ApiError("Use o celular autenticado", 400);
    const consents = body.consentimentos;
    if (!consents || consents.tratamentoBusca !== true || consents.contatoProxy !== true ||
        typeof consents.nudges !== "boolean" || typeof consents.iaReescrita !== "boolean") {
      throw new ApiError("Aceite busca e contato; informe suas preferências de lembretes e IA", 400);
    }
    const data: any = {
      nome: textField(draft.nome, "Nome", 120, true), titulo: textField(draft.titulo, "Título", 120, true),
      objetivoCrescimento: textField(draft.objetivoCrescimento, "Objetivo", 2000, true),
      resumo3linhas: textField(draft.resumo3linhas, "Resumo", 2000),
      localidade: textField(draft.localidade, "Localidade", 200), modo: textField(draft.modo, "Modo", 30),
      celular: userId, email: emailField(draft.email ?? draft.contato?.email),
      tratamentoBuscaV: 1, contatoProxyV: 1, nudgesV: consents.nudges ? 1 : 0, iaReescritaV: consents.iaReescrita ? 1 : 0,
      status: "ativo", expiresAt: new Date(Date.now() + 180 * 86400000),
    };
    for (const key of ["stack", "experiencias", "formacao", "idiomas", "links", "regimePreferido"]) {
      if (draft[key] != null && (!Array.isArray(draft[key]) || draft[key].length > 100)) throw new ApiError(key + " inválido", 400);
      data[key] = draft[key] ?? [];
    }
    for (const key of ["pretensaoDe", "pretensaoAte"]) {
      if (draft[key] != null && (!Number.isSafeInteger(draft[key]) || draft[key] < 0)) throw new ApiError(key + " inválida", 400);
      data[key] = draft[key] ?? null;
    }
    if (data.pretensaoDe != null && data.pretensaoAte != null && data.pretensaoDe > data.pretensaoAte) throw new ApiError("Faixa inválida", 400);
    data.pretensaoMoeda = draft.pretensaoMoeda ?? "BRL";
    if (!["BRL", "USD", "EUR"].includes(data.pretensaoMoeda)) throw new ApiError("Moeda inválida", 400);
    const candidate = await prisma.$transaction(async tx => {
      const saved = await tx.candidateProfile.upsert({ where: { userId }, create: { ...data, userId }, update: data });
      const texts: Record<string, string> = {
        tratamentoBusca: "Permito o tratamento do perfil para busca de oportunidades.",
        contatoProxy: "Permito contato intermediado e liberação de contato direto quando eu responder.",
        nudges: "Desejo receber lembretes de atualização do perfil.",
        iaReescrita: "Permito processamento do currículo por inteligência artificial.",
      };
      await tx.consentLog.createMany({ data: Object.entries(texts).map(([tipo, texto]) => ({
        userId, tipo, versao: 1, texto: texto + (consents[tipo] ? " Aceito." : " Não aceito."), baseLegal: "consentimento",
      })) });
      return saved;
    });
    return NextResponse.json({ id: candidate.id, status: candidate.status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
export async function GET(req: Request, ctx: Context) {
  try {
    const { userId } = requireAuth(req);
    if ((await ctx.params).id !== userId) throw new ApiError("Perfil não autorizado", 403);
    const candidate = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!candidate) throw new ApiError("Perfil não encontrado", 404);
    return NextResponse.json(candidate, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
