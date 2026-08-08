import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "jsonc-parser";

export type Ceiling = { limit: number; period: number };

export type Ceilings = {
  HOUSEHOLD_CREATION: Ceiling;
  HOUSEHOLD_WRITES: Ceiling;
  HOUSEHOLD_READS: Ceiling;
};

type RateLimit = { name: string; simple: Ceiling };

type Environment = { ratelimits: RateLimit[] };

type WranglerConfig = Environment & { env: Record<string, Environment> };

const configPath = fileURLToPath(new URL("../wrangler.jsonc", import.meta.url));

const config = (): WranglerConfig =>
  parse(readFileSync(configPath, "utf8")) as WranglerConfig;

const environment = (name?: string): Environment => {
  const loaded = config();
  if (name === undefined) return loaded;

  const found = loaded.env[name];
  if (!found)
    throw new Error(`wrangler.jsonc declares no "${name}" environment`);

  return found;
};

export const ceilings = (name?: string): Ceilings => {
  const declared = new Map(
    environment(name).ratelimits.map(({ name: limiter, simple }) => [
      limiter,
      simple,
    ]),
  );

  const of = (limiter: keyof Ceilings) => {
    const ceiling = declared.get(limiter);
    if (!ceiling)
      throw new Error(`${name ?? "production"} declares no ${limiter}`);

    return ceiling;
  };

  return {
    HOUSEHOLD_CREATION: of("HOUSEHOLD_CREATION"),
    HOUSEHOLD_WRITES: of("HOUSEHOLD_WRITES"),
    HOUSEHOLD_READS: of("HOUSEHOLD_READS"),
  };
};

export const limiterNamesIn = (name?: string) =>
  environment(name)
    .ratelimits.map(({ name: limiter }) => limiter)
    .sort();

export const environmentNames = () => Object.keys(config().env);
