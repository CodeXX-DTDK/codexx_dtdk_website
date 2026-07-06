// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  site: "https://status.codexx-dtdk.com",
  // Static shell + one on-demand route: src/pages/api/status.json.ts opts out of
  // prerendering (export const prerender = false) so it ships as a Vercel
  // serverless function that fetches/aggregates upstream status pages at request
  // time. Everything else prerenders to static HTML.
  output: "static",
  adapter: vercel(),
});
