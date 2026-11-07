import { NextResponse } from "next/server";
// No delivery provider has been selected. Never claim that an SMS was sent.
export async function POST() {
  return NextResponse.json({ error: "Login por celular indisponível: o provedor de SMS ainda não foi configurado.", code: "SMS_NOT_CONFIGURED" }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
