import { SELF, env } from "cloudflare:test";

const origin = "https://example.com";

export const ceiling = {
  creation: env.CEILINGS.HOUSEHOLD_CREATION.limit,
  writes: env.CEILINGS.HOUSEHOLD_WRITES.limit,
  reads: env.CEILINGS.HOUSEHOLD_READS.limit,
};

const overshoot = 4;

export const justPast = (limit: number) => limit + overshoot;

export const from = (ip: string) => ({ "cf-connecting-ip": ip });

export const create = (ip: string) =>
  SELF.fetch(`${origin}/api/households`, {
    method: "POST",
    headers: from(ip),
  });

export const createdSlug = async (ip: string) => {
  const body = await (await create(ip)).json<{ slug: string }>();
  return body.slug;
};

export const read = (ip: string, slug: string) =>
  SELF.fetch(`${origin}/api/households/${slug}`, { headers: from(ip) });

export const addMeal = (ip: string, slug: string, name: string) =>
  SELF.fetch(`${origin}/api/households/${slug}/meals`, {
    method: "POST",
    headers: { "content-type": "application/json", ...from(ip) },
    body: JSON.stringify({ name }),
  });

export const request = (path: string, method: string, ip?: string) =>
  SELF.fetch(`${origin}${path}`, {
    method,
    headers: ip === undefined ? undefined : from(ip),
  });

export const times = (
  count: number,
  attempt: (n: number) => Promise<Response>,
) => Promise.all(Array.from({ length: count }, (_, n) => attempt(n)));

export const refused = (responses: Response[]) =>
  responses.filter((response) => response.status === 429);

const rateLimitPeriod = 60_000;

const currentWindow = () => Math.floor(Date.now() / rateLimitPeriod);

export const withinOneWindow = async (
  burst: (attempt: number) => Promise<Response[]>,
) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const opened = currentWindow();
    const responses = await burst(attempt);
    if (currentWindow() === opened) return responses;
  }

  throw new Error(
    "The rate limit window turned during all three bursts, so none of them was counted as one",
  );
};
