import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "config",
    include: ["config/**/*.test.ts"],
    environment: "node",
    globals: true,
  },
});
