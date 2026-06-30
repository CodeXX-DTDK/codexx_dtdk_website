// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import mermaid from "astro-mermaid";
import vercel from "@astrojs/vercel";
import pagePlugin from "@pelagornis/page";
import starlightLlmsTxt from "starlight-llms-txt";

// https://astro.build/config
export default defineConfig({
  site: "https://mcp.codexx-dtdk.com",
  output: "static",
  // Web Analytics is wired via the official @vercel/analytics/astro <Analytics />
  // component in the shared PageFrameBase (parity with landing + codegen + docsgen).
  adapter: vercel(),
  integrations: [
    mermaid({
      theme: "forest",
      autoTheme: true,
    }),
    starlight({
      title: "CodeXX MCP Server",
      description:
        "An MCP server that gives your AI agent precise, structured knowledge of a C++ codebase — symbols, references, code structure, and type layout — without reading whole files.",
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
          ],
        },
        // Core Concepts
        {
          label: "Core Concepts",
          items: [
            { label: "Overview", slug: "concepts/overview" },
            { label: "Workspace & Indexing", slug: "concepts/workspace-and-indexing" },
            { label: "Symbols & Identity", slug: "concepts/symbols-and-identity" },
          ],
        },
        // Tools
        {
          label: "Tools",
          items: [
            { label: "Discovery & Facts", slug: "tools/discovery" },
            { label: "Reading Source", slug: "tools/reading-source" },
            { label: "Navigating Code", slug: "tools/navigating-code" },
            { label: "Memory Layout", slug: "tools/memory-layout" },
            { label: "Annotations", slug: "tools/annotations" },
          ],
        },
        // Guides
        {
          label: "Guides",
          items: [
            { label: "A Typical Agent Session", slug: "guides/agent-session" },
          ],
        },
        // AI & Agents
        {
          label: "AI & Agents",
          items: [
            { label: "For AI Agents", slug: "ai/for-agents" },
          ],
        },
        // Safety & Trust
        {
          label: "Safety & Trust",
          items: [
            { label: "Local-First", slug: "trust/local-first" },
            { label: "Access & Auth", slug: "trust/auth-posture" },
          ],
        },
        // Reference
        {
          label: "Reference",
          items: [
            { label: "Configuration", slug: "reference/configuration" },
            { label: "Tool Catalog", slug: "reference/tool-catalog" },
          ],
        },
      ],
    }),
  ],
});
