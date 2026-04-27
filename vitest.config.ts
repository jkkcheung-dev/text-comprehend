import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.{ts,tsx}", "packages/*/src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
  },
});
