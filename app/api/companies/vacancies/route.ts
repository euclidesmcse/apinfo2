import { NextResponse } from "next/server";
import { requireCompany, errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
export async function GET(req: Request) {
  try {
    const company = await requireCompany(req);
    const items = await prisma.vacancy.findMany({ where: { companyId: company.id }, orderBy: { updatedAt: "desc" }, take: 100 });
    return NextResponse.json({ items }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
