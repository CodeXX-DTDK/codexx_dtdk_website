// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  site: "https://www.codexx-dtdk.com",
  output: "static",
  // Web Analytics is wired via the official @vercel/analytics/astro <Analytics />
  // component in src/pages/index.astro (the adapter's webAnalytics inject is the
  // deprecated path and was not registering events on the landing project).
  adapter: vercel(),
});
