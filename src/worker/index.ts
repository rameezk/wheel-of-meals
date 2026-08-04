import { Hono } from "hono";
import type { Health } from "../shared/health";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json<Health>({ status: "ok" }));

app.notFound((c) => c.json({ error: "not_found" }, 404));

export default app;
