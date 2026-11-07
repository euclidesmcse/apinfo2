import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { requireAuth } from "./auth";
import { prisma } from "./prisma";
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export function errorResponse(error: unknown) {
  const e = error as { status?: number; statusCode?: number; code?: string; message?: string };
  const known = e.status ?? e.statusCode;
  const status = known && known >= 400 && known < 500 ? known : e.code === "P2025" ? 404 : e.code === "P2002" ? 409 : 503;
  const message = status === 503 ? "Serviço indisponível. Tente novamente mais tarde." :
    e.code === "P2025" ? "Registro não encontrado" : e.code === "P2002" ? "Registro já existente" : e.message;
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
export function assertOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin && origin !== process.env.NEXT_PUBLIC_BASE_URL)
    throw new ApiError("Origem não permitida", 403);
}
export async function readBytes(req: Request, limit = 32768): Promise<Uint8Array> {
  if (Number(req.headers.get("content-length")) > limit) throw new ApiError("Arquivo ou payload muito grande", 413);
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new ApiError("Arquivo ou payload muito grande", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}
export async function readJson(req: Request): Promise<Record<string, any>> {
  assertOrigin(req);
  const bytes = await readBytes(req);
  let value;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new ApiError("JSON inválido", 400); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError("Objeto JSON obrigatório", 400);
  return value;
}
export async function requireCompany(req: Request) {
  const user = requireAuth(req);
  const company = await prisma.companyProfile.findUnique({ where: { ownerUserId: user.userId } });
  if (!company || company.validacaoStatus === "rejeitado") throw new ApiError("Cadastre uma empresa habilitada para continuar", 403);
  return company;
}
export function requireService(req: Request, key: "CRON_SECRET" | "WEBHOOK_SECRET") {
  const secret = process.env[key];
  if (!secret || Buffer.byteLength(secret) < 32 || /dummy|change-me/i.test(secret)) throw new ApiError("Serviço não configurado", 503);
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from("Bearer " + secret);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new ApiError("Não autorizado", 401);
}
export function textField(value: unknown, name: string, max: number, required = false): string {
  if (value == null && !required) return "";
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new ApiError(name + " inválido", 400);
  return value.trim();
}
export function emailField(value: unknown): string {
  const email = textField(value, "E-mail", 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError("E-mail inválido", 400);
  return email;
}
