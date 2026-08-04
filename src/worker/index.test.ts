import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("the API surface", () => {
  it("reports that it is alive", async () => {
    const response = await SELF.fetch("https://example.com/api/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("answers an unknown API route with a 404, not the SPA", async () => {
    const response = await SELF.fetch("https://example.com/api/nonsense");

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
