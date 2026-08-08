/// <reference types="@cloudflare/vitest-pool-workers/types" />

import type { D1Migration } from "@cloudflare/vitest-pool-workers";

type Ceiling = { limit: number; period: number };

declare global {
  namespace Cloudflare {
    interface Env {
      MIGRATIONS: D1Migration[];
      CEILINGS: {
        HOUSEHOLD_CREATION: Ceiling;
        HOUSEHOLD_WRITES: Ceiling;
        HOUSEHOLD_READS: Ceiling;
      };
    }
  }
}
