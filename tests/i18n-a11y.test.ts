import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import { t, formatCurrency, formatDateByLocale, getLocaleFromPath } from "../lib/locale";
describe("Locale routing", () => {
  it("rewrites the English prefix and forwards the locale to the server", () => {
    const response = middleware(new NextRequest("http://localhost/en/vagas?q=Cloud"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost/vagas?q=Cloud");
    expect(response.headers.get("x-middleware-request-x-next-intl-locale")).toBe("en");
    expect(getLocaleFromPath("/en/vagas")).toBe("en");
  });
  it("honors explicit language before browser preference", () => {
    const response = middleware(new NextRequest("http://localhost/vagas?lang=pt-BR", { headers: { "accept-language": "en" } }));
    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("pt-BR");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
  it("formats currency and dates by locale", () => {
    expect(formatCurrency(12000, "en")).toContain("12,000");
    expect(formatDateByLocale("2026-11-07T12:00:00Z", "pt-BR")).toBe("07/11/2026");
    expect(t("pt-BR", "vagas.title")).toBeTruthy();
  });
});
