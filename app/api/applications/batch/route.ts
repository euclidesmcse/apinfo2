import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, errorResponse, readJson, requireCompany, requireService } from "@/lib/api";
import { batchIds, createBatch, proxyEvent } from "@/lib/batches";
export async function POST(req: Request) {
  try {
    const { userId } = requireAuth(req);
    const candidate = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!candidate) throw new ApiError("Publique seu currículo antes de se candidatar", 409);
    const body = await readJson(req);
    
    const ids = batchIds(body.vacancyIds);
    const results = await createBatch("apply", candidate.id, ids, body);
    const errors = results.filter(item => item.status === "error");
    const status = errors.length === 0 ? 201 : errors.length < results.length ? 207 :
      results.every(item => item.code === results[0].code) ? results[0].code : 207;
    return NextResponse.json({ results, loteId: body.loteId }, { status, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
export async function GET(req: Request) {
  try {
    const { userId } = requireAuth(req);
    const applications = await prisma.application.findMany({
      where: { candidate: { userId } }, orderBy: { createdAt: "desc" }, take: 100,
      include: { vacancy: { select: { titulo: true } }, company: { select: { nome: true } } },
    });
    const items = applications;
    return NextResponse.json({ applications: items, results: items }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(req: Request) {
  try {
    requireService(req, "WEBHOOK_SECRET");
    const result = await proxyEvent(await readJson(req));
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
