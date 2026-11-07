import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readJson, errorResponse, textField, emailField } from "@/lib/api";
export async function POST(req: Request) {
  try {
    const { userId } = requireAuth(req);
    const body = await readJson(req);
    const data = { nome: textField(body.nome, "Nome", 120, true), email: emailField(body.email) };
    const company = await prisma.companyProfile.upsert({ where: { ownerUserId: userId },
      create: { ...data, ownerUserId: userId }, update: data });
    return NextResponse.json({ company }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
