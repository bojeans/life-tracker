import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Default to node; component tests opt into jsdom via a
    // `// @vitest-environment jsdom` directive at the top of the file.
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Exclude Playwright e2e tests from the Vitest run
    exclude: ["**/node_modules/**", "**/e2e/**", "**/*.spec.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
