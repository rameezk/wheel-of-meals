import { Hono } from "hono";
import { failure, notFound } from "../shared/api";
import type { Health } from "../shared/health";
import { households } from "./households";
import { meals } from "./meals";
import { rateLimitRequests } from "./rate-limit";

const apiPrefix = "/api/";

const app = new Hono<{ Bindings: Env }>();

app.use(`${apiPrefix}*`, rateLimitRequests);

app.get("/api/health", (c) => c.json<Health>({ status: "ok" }));

app.route("/", households);
app.route("/", meals);

app.notFound((c) =>
  c.req.path.startsWith(apiPrefix)
    ? c.json(notFound, 404)
    : c.env.ASSETS.fetch(c.req.raw),
);

app.onError((error, c) => {
  console.error(error);
  return c.json(failure, 500);
});

const withReferrerPolicy = (response: Response) => {
  const served = new Response(response.body, response);
  served.headers.set("Referrer-Policy", "same-origin");
  return served;
};

export default {
  fetch: async (request, env, ctx) =>
    withReferrerPolicy(await app.fetch(request, env, ctx)),
} satisfies ExportedHandler<Env>;
