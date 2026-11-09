import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  // tsconfig usa jsx "preserve" (o Next compila); o teste precisa do runtime automatico.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@app": resolve(__dirname, "app"),
    },
  },
});
