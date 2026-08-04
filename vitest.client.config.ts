import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "client",
    include: ["src/client/**/*.test.tsx", "src/shared/**/*.test.ts"],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/client/test-setup.ts"],
  },
});
