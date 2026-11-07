import { NextResponse } from "next/server";
import { buildVacancyPayload } from "@/lib/vacancy";
import { readJson, requireCompany, errorResponse, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
export { GET } from "../search/vacancies/route";
export async function POST(req: Request) {
  try {
    const company = await requireCompany(req);
    const body = await readJson(req);
    if (body.companyId && body.companyId !== company.id) throw new ApiError("Empresa não autorizada", 403);
    const { companyValidacaoStatus, _lastRenewAt, ...data } = buildVacancyPayload({ ...body, companyId: company.id });
    const created = await prisma.vacancy.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
