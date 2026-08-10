import { createExecutionContext, SELF } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "./index";
import {
  ceiling,
  create,
  justPast,
  refused,
  times,
  withinOneWindow,
} from "./test-callers";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

const served = (
  path: string,
  env: Env,
  init?: RequestInit<IncomingRequestCfProperties>,
) =>
  worker.fetch(
    new IncomingRequest(`https://example.com${path}`, init),
    env,
    createExecutionContext(),
  );

const document = '<!doctype html><html lang="en"></html>';

const whereTheAssetsAre = () =>
  ({
    ASSETS: {
      fetch: () =>
        Promise.resolve(
          new Response(document, {
            headers: { "content-type": "text/html; charset=utf-8" },
          }),
        ),
    },
  }) as unknown as Env;

const whereTheDatabaseIsGone = () => {
  vi.spyOn(console, "error").mockImplementation(() => {});

  return {
    DB: {
      prepare: () => {
        throw new Error("the database is gone");
      },
    },
  } as unknown as Env;
};

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it("answers a Household's own address with the SPA, not a 404", async () => {
    const response = await served(
      "/gouda-tacos-miso-plum",
      whereTheAssetsAre(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    await expect(response.text()).resolves.toBe(document);
  });

  it("answers a request it cannot serve with a 500", async () => {
    const response = await served("/api/households", whereTheDatabaseIsGone(), {
      method: "POST",
    });

    expect(response.status).toBe(500);
  });
});

describe("the Slug never leaving the origin", () => {
  const policyOf = (response: Response) =>
    response.headers.get("referrer-policy");

  it("declares the policy on the app's own document", async () => {
    const response = await served(
      "/gouda-tacos-miso-plum",
      whereTheAssetsAre(),
    );

    expect(policyOf(response)).toBe("same-origin");
  });

  it("declares the policy on an API response", async () => {
    const response = await SELF.fetch("https://example.com/api/health");

    expect(policyOf(response)).toBe("same-origin");
  });

  it("declares the policy on a not-found response", async () => {
    const response = await SELF.fetch("https://example.com/api/nonsense");

    expect(policyOf(response)).toBe("same-origin");
  });

  it("declares the policy on a failed response", async () => {
    const response = await served("/api/households", whereTheDatabaseIsGone(), {
      method: "POST",
    });

    expect(policyOf(response)).toBe("same-origin");
  });

  it("declares the policy on a rate-limited response", async () => {
    const denied = refused(
      await withinOneWindow(() =>
        times(justPast(ceiling.creation), () => create("203.0.113.103")),
      ),
    );

    expect(denied.length).toBeGreaterThan(0);
    for (const response of denied)
      expect(policyOf(response)).toBe("same-origin");
  });
});
