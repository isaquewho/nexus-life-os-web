import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt-BR", "en-US", "es-ES", "zh-CN", "hi-IN", "ar-SA"],
  defaultLocale: "pt-BR",
});
