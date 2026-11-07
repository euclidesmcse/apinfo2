import * as crypto from "crypto";
export const JWT_COOKIE_NAME = "w2talent_token";
export const JWT_EXPIRES_DAYS = 7;
function httpError(message: string, status: number) { return Object.assign(new Error(message), { status }); }
function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s && Buffer.byteLength(s) >= 32 && !/dummy|change-me/i.test(s)) return s;
  if (process.env.NODE_ENV === "test" && !s) return "test-only-secret-at-least-32-characters";
  throw httpError("JWT_SECRET deve conter pelo menos 32 bytes e não ser um exemplo", 503);
}


export function normalizeCelular(raw: string): string {
  if (!raw || typeof raw !== "string") return raw;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  // já com DDI 55
  if (digits.startsWith("55") && digits.length >= 12) {
    return "+" + digits;
  }
  // 11 digitos (DDD+9+8) ou 10 digitos sem DDI
  if (digits.length === 11 || digits.length === 10) {
    return "+55" + digits;
  }
  // fallback: se tiver + já
  if (raw.trim().startsWith("+")) return "+" + digits;
  return "+" + digits;
}

export function isValidCelularBR(raw: string): boolean {
  if (!raw || typeof raw !== "string") return false;
  const norm = normalizeCelular(raw);
  return /^\+55\d{10,11}$/.test(norm);
}


function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function base64urlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString("utf-8");
}

export function signJwt(payload: Record<string, unknown>, expiresDays = JWT_EXPIRES_DAYS): string {
  const header = { alg: "HS256", typ: "JWT" };
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + expiresDays * 24 * 60 * 60;
  const fullPayload = { ...payload, iat: nowSec, exp: expSec, iss: "w2talent", aud: "w2talent" };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(fullPayload));
  const data = `${h}.${p}`;
  const sig = base64url(crypto.createHmac("sha256", getJwtSecret()).update(data).digest());
  return `${data}.${sig}`;
}

export function verifyJwt(token: string): Record<string, any> | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const data = `${h}.${p}`;
  const expected = base64url(crypto.createHmac("sha256", getJwtSecret()).update(data).digest());
  try {
    const a = Buffer.from(sig, "utf-8");
    const b = Buffer.from(expected, "utf-8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const header = JSON.parse(base64urlDecode(h));
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;
    const payload = JSON.parse(base64urlDecode(p));
    const nowSec = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(payload.exp) || nowSec >= payload.exp || payload.iss !== "w2talent" || payload.aud !== "w2talent" || typeof payload.userId !== "string" || !payload.userId) return null;
    return payload;
  } catch {
    return null;
  }
}


export function requireAuth(req: Request | { headers: any; cookies?: any }): { userId: string; celular: string; [k: string]: any } {
  let token: string | null = null;
  // headers: Request, NextRequest, ou plain object
  const headers: any = (req as any).headers;
  let authHeader: string | null = null;
  let cookieHeader: string | null = null;

  if (headers) {
    if (typeof headers.get === "function") {
      authHeader = headers.get("authorization") ?? headers.get("Authorization");
      cookieHeader = headers.get("cookie") ?? headers.get("Cookie");
    } else {
      authHeader = headers["authorization"] ?? headers["Authorization"] ?? headers["authorization".toLowerCase()];
      cookieHeader = headers["cookie"] ?? headers["Cookie"];
    }
  }
  // NextRequest cookies API
  const cookiesObj: any = (req as any).cookies;
  if (cookiesObj && typeof cookiesObj.get === "function") {
    const c = cookiesObj.get(JWT_COOKIE_NAME);
    if (c?.value) token = c.value;
  }

  if (!token && authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }
  if (!token && cookieHeader) {
    const match = cookieHeader.match(new RegExp(`${JWT_COOKIE_NAME}=([^;\\s]+)`));
    if (match) token = match[1];
  }
  if (!token) {
    throw httpError("não autorizado: token ausente", 401);
  }
  const payload = verifyJwt(token);
  if (!payload || !payload.userId) {
    throw httpError("não autorizado: token inválido ou expirado", 401);
  }
  return { userId: payload.userId, celular: payload.userId };
}
