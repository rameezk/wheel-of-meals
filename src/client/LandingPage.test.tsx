import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tooManyRequests } from "../shared/api";
import { LandingPage } from "./LandingPage";
import { remember } from "./remembered";
import { aHousehold, aSlug, answerWith } from "./test-fixtures";

const pressCreate = () =>
  userEvent.click(screen.getByRole("button", { name: /create/i }));

const pressCopy = async () =>
  userEvent.click(await screen.findByRole("button", { name: /copy/i }));

const clipboardThat = (writeText: () => Promise<void>) =>
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

const typeSlug = async (typed: string) => {
  await userEvent.type(screen.getByLabelText(/four words/i), typed);
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("the landing page", () => {
  it("names the app", () => {
    render(<LandingPage onGo={() => {}} />);

    expect(
      screen.getByRole("heading", { name: /wheel of meals/i }),
    ).toBeInTheDocument();
  });

  it("offers a button that creates a Household", async () => {
    answerWith(aHousehold, 201);

    render(<LandingPage onGo={() => {}} />);
    await pressCreate();

    expect(
      await screen.findByText(aSlug, { exact: false }),
    ).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/households",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("warns bluntly that the link cannot be recovered", async () => {
    answerWith(aHousehold, 201);

    render(<LandingPage onGo={() => {}} />);
    await pressCreate();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /cannot be recovered/i,
    );
  });

  it("copies the link to the clipboard", async () => {
    answerWith(aHousehold, 201);
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboardThat(writeText);

    render(<LandingPage onGo={() => {}} />);
    await pressCreate();
    await pressCopy();

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/${aSlug}`,
    );
    expect(await screen.findByText(/copied/i)).toBeInTheDocument();
  });

  it("tells you to copy by hand when the browser refuses", async () => {
    answerWith(aHousehold, 201);
    clipboardThat(vi.fn().mockRejectedValue(new Error("denied")));

    render(<LandingPage onGo={() => {}} />);
    await pressCreate();
    await pressCopy();

    expect(await screen.findByText(/copy it by hand/i)).toBeInTheDocument();
  });

  it("links onward to the new Household", async () => {
    answerWith(aHousehold, 201);

    render(<LandingPage onGo={() => {}} />);
    await pressCreate();

    expect(await screen.findByRole("link", { name: /open/i })).toHaveAttribute(
      "href",
      `/${aSlug}`,
    );
  });

  it("says so when creation fails, and lets you try again", async () => {
    answerWith({ error: "failed" }, 500);

    render(<LandingPage onGo={() => {}} />);
    await pressCreate();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
    expect(screen.getByRole("button", { name: /create/i })).toBeEnabled();
  });

  it("passes on why a rate-limited creation was refused", async () => {
    answerWith(tooManyRequests, 429);

    render(<LandingPage onGo={() => {}} />);
    await pressCreate();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      tooManyRequests.message,
    );
    expect(screen.getByRole("button", { name: /create/i })).toBeEnabled();
  });
});

describe("the way back into a remembered Household", () => {
  it("offers the last one opened by name", async () => {
    remember({ slug: aSlug, name: "The Khans" });
    const go = vi.fn();

    render(<LandingPage onGo={go} />);
    await userEvent.click(screen.getByRole("button", { name: /the khans/i }));

    expect(go).toHaveBeenCalledWith(`/${aSlug}`);
  });

  it("offers an unnamed one by its Slug", () => {
    remember({ slug: aSlug, name: null });

    render(<LandingPage onGo={() => {}} />);

    expect(
      screen.getByRole("button", { name: new RegExp(aSlug) }),
    ).toBeInTheDocument();
  });

  it("offers nothing to reopen before any Household has been opened", () => {
    render(<LandingPage onGo={() => {}} />);

    expect(
      screen.queryByRole("button", { name: /^open .+/i }),
    ).not.toBeInTheDocument();
  });

  it("waits to be asked, and never redirects on its own", () => {
    remember({ slug: aSlug, name: "The Khans" });
    const go = vi.fn();

    render(<LandingPage onGo={go} />);

    expect(go).not.toHaveBeenCalled();
  });
});

describe("typing a Slug in", () => {
  it("opens the Household those four words name", async () => {
    answerWith(aHousehold);
    const go = vi.fn();

    render(<LandingPage onGo={go} />);
    await typeSlug("  Banana Apple DELICIOUS sauce  ");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/households/${aSlug}`,
      expect.anything(),
    );
    expect(go).toHaveBeenCalledWith(`/${aSlug}`);
  });

  it("says plainly when no Household answers to them", async () => {
    answerWith({ error: "not_found", message: "nope" }, 404);
    const go = vi.fn();

    render(<LandingPage onGo={go} />);
    await typeSlug(aSlug);

    expect(await screen.findByRole("alert")).toHaveTextContent(/not found/i);
    expect(go).not.toHaveBeenCalled();
  });

  it("keeps the words exactly as they were typed so a typo can be fixed", async () => {
    answerWith({ error: "not_found", message: "nope" }, 404);
    const typed = "Banana Apple Delicious Sauce";

    render(<LandingPage onGo={() => {}} />);
    await typeSlug(typed);

    await screen.findByRole("alert");
    expect(screen.getByLabelText(/four words/i)).toHaveValue(typed);
  });

  it("asks for all four words when fewer were typed", async () => {
    answerWith(aHousehold);
    const go = vi.fn();

    render(<LandingPage onGo={go} />);
    await typeSlug("banana apple delicious");

    expect(await screen.findByRole("alert")).toHaveTextContent(/four/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(go).not.toHaveBeenCalled();
  });

  it("says so when the lookup itself fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    render(<LandingPage onGo={() => {}} />);
    await typeSlug(aSlug);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
  });
});
