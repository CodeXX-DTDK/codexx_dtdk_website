// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

// get.codexx-dtdk.com — the CodeXX DTDK distribution surface. Serves the
// bootstrap installers (public/install.{sh,ps1}, public/uninstall.{sh,ps1}) as
// static files and hosts the token-bearing download proxy at /api/download
// (SSR, prerender=false) that resolves private manager releases server-side.
export default defineConfig({
  site: "https://get.codexx-dtdk.com",
  output: "static",
  adapter: vercel(),
});
