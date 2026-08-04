import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "./LandingPage";
import { aHousehold, aSlug, answerWith } from "./test-fixtures";

const pressCreate = () =>
  userEvent.click(screen.getByRole("button", { name: /create/i }));

const pressCopy = async () =>
  userEvent.click(await screen.findByRole("button", { name: /copy/i }));

const clipboardThat = (writeText: () => Promise<void>) =>
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the landing page", () => {
  it("names the app", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", { name: /wheel of meals/i }),
    ).toBeInTheDocument();
  });

  it("offers a button that creates a Household", async () => {
    answerWith(aHousehold, 201);

    render(<LandingPage />);
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

    render(<LandingPage />);
    await pressCreate();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /cannot be recovered/i,
    );
  });

  it("copies the link to the clipboard", async () => {
    answerWith(aHousehold, 201);
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboardThat(writeText);

    render(<LandingPage />);
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

    render(<LandingPage />);
    await pressCreate();
    await pressCopy();

    expect(await screen.findByText(/copy it by hand/i)).toBeInTheDocument();
  });

  it("links onward to the new Household", async () => {
    answerWith(aHousehold, 201);

    render(<LandingPage />);
    await pressCreate();

    expect(await screen.findByRole("link", { name: /open/i })).toHaveAttribute(
      "href",
      `/${aSlug}`,
    );
  });

  it("says so when creation fails, and lets you try again", async () => {
    answerWith({ error: "failed" }, 500);

    render(<LandingPage />);
    await pressCreate();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
    expect(screen.getByRole("button", { name: /create/i })).toBeEnabled();
  });
});
