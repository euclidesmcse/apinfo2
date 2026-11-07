import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { defaultLocale, isValidLocale } from "./lib/locale";
export * from "./lib/locale";
export default getRequestConfig(async () => {
  const localeHeader = (await headers()).get("x-next-intl-locale");
  const locale = isValidLocale(localeHeader) ? localeHeader : defaultLocale;
  const messages = (await import("./messages/" + locale + ".json")).default;
  return { locale, messages };
});
