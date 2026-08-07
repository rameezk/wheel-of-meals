import type { Context, MiddlewareHandler } from "hono";
import { tooManyRequests } from "../shared/api";
import { householdCreationPath } from "./households";

type Ctx = Context<{ Bindings: Env }>;

const writeMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);

const limiterFor = (c: Ctx): RateLimit => {
  if (!writeMethods.has(c.req.method)) return c.env.HOUSEHOLD_READS;
  return c.req.path === householdCreationPath
    ? c.env.HOUSEHOLD_CREATION
    : c.env.HOUSEHOLD_WRITES;
};

export const rateLimitRequests: MiddlewareHandler<{ Bindings: Env }> = async (
  c,
  next,
) => {
  const limiter = limiterFor(c);
  const caller = c.req.header("cf-connecting-ip");
  if (!caller) return next();

  const { success } = await limiter.limit({ key: caller });
  if (!success) return c.json(tooManyRequests, 429);

  return next();
};
