import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import { ceilings } from "./config/ceilings.ts";

const migrations = await readD1Migrations("./migrations");

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc", environment: "test" },
      miniflare: {
        bindings: { MIGRATIONS: migrations, CEILINGS: ceilings("test") },
      },
    }),
  ],
  test: {
    name: "worker",
    include: ["src/worker/**/*.test.ts"],
    setupFiles: ["./src/worker/test-setup.ts"],
    globals: true,
  },
});
