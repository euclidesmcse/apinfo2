import { NextRequest, NextResponse } from "next/server";
import { normalizeCelular, isValidCelularBR, verifyOtp, JWT_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawCelular = body.celular ?? body.phone ?? "";
    const codigo = String(body.codigo ?? body.code ?? "").trim();
    const consents = body.consentimentos ?? body.consents ?? body.consent ?? body;

    if (!rawCelular || !codigo) {
      return NextResponse.json({ error: "celular e codigo obrigatórios" }, { status: 400 });
    }
    const celular = normalizeCelular(String(rawCelular));
    if (!isValidCelularBR(celular)) {
      return NextResponse.json({ error: "celular inválido" }, { status: 400 });
    }

    // consents may be nested; normalize to 4-flag shape
    let consentPayload: any = consents;
    // if body has flat flags, use them
    if (body.tratamentoBusca !== undefined) {
      consentPayload = {
        tratamentoBusca: body.tratamentoBusca,
        contatoProxy: body.contatoProxy,
        nudges: body.nudges,
        iaReescrita: body.iaReescrita,
        versao: body.versao,
        textos: body.textos,
      };
    } else if (consents && typeof consents === "object") {
      // already shape
      consentPayload = consents;
    }

    const { token, userId } = verifyOtp(celular, codigo, consentPayload);
    const res = NextResponse.json({ jwt: token, token, userId }, { status: 200 });
    res.cookies.set(JWT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return res;
  } catch (e: any) {
    const status = e.status ?? e.statusCode ?? 500;
    return NextResponse.json({ error: e.message ?? "erro interno" }, { status });
  }
}
