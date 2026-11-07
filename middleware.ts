import { NextRequest, NextResponse } from "next/server";
import { isValidLocale, stripLocale } from "./lib/locale";
export function middleware(req: NextRequest) {
  const prefix = req.nextUrl.pathname.split("/")[1];
  const query = req.nextUrl.searchParams.get("lang"), cookie = req.cookies.get("NEXT_LOCALE")?.value;
  const locale = isValidLocale(prefix) ? prefix : isValidLocale(query) ? query : isValidLocale(cookie) ? cookie :
    req.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : "pt-BR";
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-next-intl-locale", locale);
  requestHeaders.set("x-locale", locale);
  const url = req.nextUrl.clone();
  url.pathname = stripLocale(url.pathname);
  const response = url.pathname !== req.nextUrl.pathname
    ? NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set("NEXT_LOCALE", locale, { path: "/", sameSite: "lax", maxAge: 31536000 });
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env.INDEXABLE !== "true") response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
export const config = { matcher: ["/((?!_next|.*\\..*).*)"] };
