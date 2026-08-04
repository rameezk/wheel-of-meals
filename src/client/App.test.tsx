import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const respondWith = (body: unknown, status = 200) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the landing page", () => {
  it("names the app", () => {
    respondWith({ status: "ok" });

    render(<App />);

    expect(
      screen.getByRole("heading", { name: /wheel of meals/i }),
    ).toBeInTheDocument();
  });

  it("reports the API as reachable once it answers", async () => {
    respondWith({ status: "ok" });

    render(<App />);

    expect(await screen.findByText(/api is awake/i)).toBeInTheDocument();
  });

  it("reports the API as unreachable when it answers with something unexpected", async () => {
    respondWith({ status: "who knows" });

    render(<App />);

    expect(await screen.findByText(/api is unreachable/i)).toBeInTheDocument();
  });

  it("reports the API as unreachable when it fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    render(<App />);

    expect(await screen.findByText(/api is unreachable/i)).toBeInTheDocument();
  });
});
