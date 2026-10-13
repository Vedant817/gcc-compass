import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest needs the same `@/` alias as tsconfig/Next so tests can import modules
 * that use it (e.g. components/add-source/addSourceShared.ts).
 */
export default defineConfig({
  // match Next's automatic JSX runtime so tests can render components that
  // don't import React explicitly
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
