import { NextRequest, NextResponse } from "next/server";
import { isValidCelularBR, requestOtp, normalizeCelular } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = body.celular ?? body.phone ?? body.celularE164 ?? "";
    if (!raw) {
      return NextResponse.json({ error: "celular obrigatório (E.164 BR)" }, { status: 400 });
    }
    const celular = normalizeCelular(String(raw));
    if (!isValidCelularBR(celular)) {
      return NextResponse.json({ error: "celular inválido, use +55..." }, { status: 400 });
    }
    const rec = requestOtp(celular);
    // Em produção não expor código; stub envia SMS
    const payload: Record<string, unknown> = { sent: true, expiraEm: rec.expiraEm.toISOString() };
    if (process.env.NODE_ENV !== "production") {
      payload.debugCodigo = rec.codigo;
    }
    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    const status = e.status ?? e.statusCode ?? 500;
    return NextResponse.json({ error: e.message ?? "erro interno" }, { status });
  }
}
