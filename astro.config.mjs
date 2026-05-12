// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import mermaid from "astro-mermaid";
import vercel from "@astrojs/vercel";
import pagePlugin from "@pelagornis/page";
import starlightLlmsTxt from "starlight-llms-txt";
import starlightVersions from "starlight-versions";

// https://astro.build/config
export default defineConfig({
  site: "https://www.codexx-dtdk.com",
  output: "static",
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
  }),
  integrations: [
    mermaid({
      theme: "forest",
      autoTheme: true,
    }),
    starlight({
      title: "codegen",
      description:
        "A C++ code generation engine. LuaU rules, sandboxed execution, deterministic output.",
      plugins: [
        starlightVersions({
          current: {
            label: "0.0.1",
          },
          versions: [{ slug: "0.0.1" }],
        }),
        pagePlugin(),
        starlightLlmsTxt({ exclude: ["trust/**"] }),
      ],
      social: [
        {
          icon: "seti:markdown",
          label: "llms.txt (for AI agents)",
          href: "/llms-full.txt",
        },
      ],
      components: {
        SocialIcons: "./src/components/HeaderNav.astro",
        PageFrame: "./src/components/PageFrame.astro",
      },
      sidebar: [
        // Getting Started
        {
          label: "Getting Started",
          items: [
            { label: "Installation", slug: "getting-started/installation" },
            { label: "Quick Start", slug: "getting-started/quick-start" },
            { label: "Your First Rule", slug: "getting-started/first-rule" },
          ],
        },
        // Core Concepts
        {
          label: "Core Concepts",
          items: [
            { label: "How It Works", slug: "concepts/how-it-works" },
            { label: "The AST Schema", slug: "concepts/ast-schema" },
            { label: "Rule Lifecycle", slug: "concepts/rule-lifecycle" },
            { label: "Grouping & Fan-in", slug: "concepts/grouping" },
            { label: "Preamble System", slug: "concepts/preamble" },
          ],
        },
        // The Rule System
        {
          label: "Rule System",
          items: [
            { label: "Rule Anatomy", slug: "rules/anatomy" },
            { label: "LuaU Sandbox", slug: "rules/luau-sandbox" },
            { label: "Writing Transforms", slug: "rules/writing-transforms" },
            { label: "Grouping Logic", slug: "rules/grouping" },
            { label: "Inline Injection", slug: "rules/inline-injection" },
            { label: "Permissions Model", slug: "rules/permissions" },
          ],
        },
        // Examples
        {
          label: "Examples",
          items: [
            { label: "ToString: enum ⇒ switch", slug: "examples/to-string" },
            {
              label: "TypeScript Types: struct ⇒ interface",
              slug: "examples/typescript-types",
            },
            {
              label: "Markdown Docs: N structs ⇒ 1 file",
              slug: "examples/markdown-docs",
            },
          ],
        },
        // Integrations
        {
          label: "Integrations",
          items: [
            { label: "CLI Reference", slug: "integrations/cli" },
            { label: "CMake Integration", slug: "integrations/cmake" },
            {
              label: "VS Code DAP Debugger",
              slug: "integrations/vscode-debugger",
            },
          ],
        },
        // Safety & Trust
        {
          label: "Safety & Trust",
          items: [
            { label: "No-Call-Home Guarantee", slug: "trust/no-call-home" },
            { label: "Sandboxed Execution", slug: "trust/sandbox" },
            { label: "SLSA Compliance", slug: "trust/slsa" },
            { label: "Supply Chain", slug: "trust/supply-chain" },
          ],
        },
        // Licensing
        {
          label: "Licensing",
          items: [
            { label: "Tiers & Pricing", slug: "licensing/tiers" },
            { label: "License Activation", slug: "licensing/activation" },
          ],
        },
        // Reference
        {
          label: "Reference",
          items: [
            { label: "Config Schema (.yaml)", slug: "reference/config-schema" },
            { label: "LuaU Globals", slug: "reference/luau-globals" },
            { label: "Diagnostic Codes", slug: "reference/diagnostics" },
            {
              label: "AST Schemas",
              autogenerate: { directory: "reference/schemas" },
            },
          ],
        },
      ],
    }),
  ],
});
