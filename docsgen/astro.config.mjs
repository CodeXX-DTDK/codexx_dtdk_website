// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import mermaid from "astro-mermaid";
import vercel from "@astrojs/vercel";
import pagePlugin from "@pelagornis/page";
import starlightLlmsTxt from "starlight-llms-txt";

// https://astro.build/config
export default defineConfig({
  site: "https://docsgen.codexx-dtdk.com",
  output: "static",
  // Web Analytics is wired via the official @vercel/analytics/astro <Analytics />
  // component in src/components/PageFrame.astro (parity with landing + codegen).
  adapter: vercel(),
  integrations: [
    mermaid({
      theme: "forest",
      autoTheme: true,
    }),
    starlight({
      title: "docsgen",
      description:
        "A C++ API documentation generator. Turns annotated headers into MDX + llms.txt. Deterministic, local-first, free.",
      plugins: [pagePlugin(), starlightLlmsTxt()],
      social: [
        {
          icon: "seti:markdown",
          label: "llms.txt (for AI agents)",
          href: "/llms-full.txt",
        },
      ],
      components: {
        PageFrame: "./src/components/PageFrame.astro",
      },
      sidebar: [
        // Getting Started
        {
          label: "Getting Started",
          items: [
            { label: "Installation", slug: "getting-started/installation" },
            { label: "Quick Start", slug: "getting-started/quick-start" },
            { label: "Your First Docs", slug: "getting-started/first-docs" },
          ],
        },
        // Core Concepts
        {
          label: "Core Concepts",
          items: [
            { label: "How It Works", slug: "concepts/how-it-works" },
            { label: "What It Generates", slug: "concepts/what-it-generates" },
            { label: "Public API Surface", slug: "concepts/public-api" },
            { label: "Catalog Pages", slug: "concepts/catalogs" },
          ],
        },
        // Documenting Code
        {
          label: "Documenting Code",
          items: [
            { label: "Doc Comments & Tags", slug: "comments/doc-comments" },
            { label: "Cross-Linking", slug: "comments/cross-linking" },
          ],
        },
        // AI & Agents
        {
          label: "AI & Agents",
          items: [
            { label: "LLM Summaries", slug: "ai/llm-summaries" },
            { label: "llms.txt", slug: "ai/llms-txt" },
          ],
        },
        // Integrations
        {
          label: "Integrations",
          items: [
            { label: "Astro / Starlight", slug: "integrations/astro" },
            { label: "CI Pipelines", slug: "integrations/ci" },
          ],
        },
        // Safety & Trust
        {
          label: "Safety & Trust",
          items: [
            { label: "Local-First", slug: "trust/local-first" },
            { label: "Supply Chain", slug: "trust/supply-chain" },
          ],
        },
        // Reference
        {
          label: "Reference",
          items: [
            { label: "Config Schema (.yaml)", slug: "reference/config-schema" },
            { label: "CLI Reference", slug: "reference/cli" },
          ],
        },
      ],
    }),
  ],
});
