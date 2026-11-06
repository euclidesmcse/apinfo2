/**
 * middleware — next-intl locale routing (Task 10)
 * - /en/* => locale en
 * - default pt-BR
 * - lang no embedding query já via search routes
 */
import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "./i18n";

function getLocaleFromRequest(req: NextRequest): string {
  const pathname = req.nextUrl.pathname;
  // 1) path prefix
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg && (locales as readonly string[]).includes(seg)) return seg;
  // 2) accept-language header
  const al = req.headers.get("accept-language") ?? "";
  if (al.toLowerCase().startsWith("en")) return "en";
  // 3) cookie
  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) return cookieLocale;
  // 4) query ?lang=
  const lang = req.nextUrl.searchParams.get("lang");
  if (lang && (locales as readonly string[]).includes(lang)) return lang;
  return defaultLocale;
}

export function middleware(req: NextRequest): NextResponse {
  const pathname = req.nextUrl.pathname;
  // skip api, _next, static
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon")
  ) {
    // still set x-locale header for API lang passthrough
    const locale = req.nextUrl.searchParams.get("lang") ?? getLocaleFromRequest(req);
    const res = NextResponse.next();
    res.headers.set("x-locale", locale);
    res.headers.set("x-next-intl-locale", locale);
    return res;
  }

  const locale = getLocaleFromRequest(req);

  // if pathname starts with /en, strip for internal routing (as-needed prefix)
  const seg = pathname.split("/").filter(Boolean)[0];
  const hasLocalePrefix = seg && (locales as readonly string[]).includes(seg);
  if (hasLocalePrefix && seg !== defaultLocale) {
    // keep URL as-is for client routing, but set header
    const res = NextResponse.next();
    res.headers.set("x-locale", locale);
    res.headers.set("x-next-intl-locale", locale);
    // cookie
    res.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // for default locale, also set header
  const res = NextResponse.next();
  res.headers.set("x-locale", locale);
  res.headers.set("x-next-intl-locale", locale);
  res.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
