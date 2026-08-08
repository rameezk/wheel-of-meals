import { Hono } from "hono";
import { failure, notFound } from "../shared/api";
import type { Health } from "../shared/health";
import { households } from "./households";
import { meals } from "./meals";
import { rateLimitRequests } from "./rate-limit";

const app = new Hono<{ Bindings: Env }>();

app.use(rateLimitRequests);

app.get("/api/health", (c) => c.json<Health>({ status: "ok" }));

app.route("/", households);
app.route("/", meals);

app.notFound((c) => c.json(notFound, 404));

app.onError((error, c) => {
  console.error(error);
  return c.json(failure, 500);
});

export default app;
