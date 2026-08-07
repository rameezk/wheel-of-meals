import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tooManyRequests } from "../shared/api";
import { householdsInMemory } from "./households-in-memory";
import { LandingPage } from "./LandingPage";
import { remember } from "./remembered";
import { aSlug } from "./test-fixtures";

const pressCreate = () =>
  userEvent.click(screen.getByRole("button", { name: /create/i }));

const pressCopy = async () =>
  userEvent.click(await screen.findByRole("button", { name: /copy/i }));

const clipboardThat = (writeText: () => Promise<void>) =>
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

const fourWords = /^[a-z]+(-[a-z]+){3}$/;

const revealedSlug = async () =>
  (await screen.findByText(fourWords)).textContent ?? "";

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
    render(<LandingPage households={householdsInMemory()} onGo={() => {}} />);

    expect(
      screen.getByRole("heading", { name: /wheel of meals/i }),
    ).toBeInTheDocument();
  });

  it("offers a button that creates a Household", async () => {
    const households = householdsInMemory();

    render(<LandingPage households={households} onGo={() => {}} />);
    await pressCreate();

    expect(await households.open(await revealedSlug())).not.toBeNull();
  });

  it("warns bluntly that the link cannot be recovered", async () => {
    render(<LandingPage households={householdsInMemory()} onGo={() => {}} />);
    await pressCreate();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /cannot be recovered/i,
    );
  });

  it("copies the link to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboardThat(writeText);

    render(<LandingPage households={householdsInMemory()} onGo={() => {}} />);
    await pressCreate();
    const slug = await revealedSlug();
    await pressCopy();

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/${slug}`);
    expect(await screen.findByText(/copied/i)).toBeInTheDocument();
  });

  it("tells you to copy by hand when the browser refuses", async () => {
    clipboardThat(vi.fn().mockRejectedValue(new Error("denied")));

    render(<LandingPage households={householdsInMemory()} onGo={() => {}} />);
    await pressCreate();
    await pressCopy();

    expect(await screen.findByText(/copy it by hand/i)).toBeInTheDocument();
  });

  it("links onward to the new Household", async () => {
    const households = householdsInMemory();

    render(<LandingPage households={households} onGo={() => {}} />);
    await pressCreate();

    expect(
      await screen.findByRole("link", { name: /open my household/i }),
    ).toHaveAttribute("href", `/${await revealedSlug()}`);
  });

  it("says so when creation fails, and lets you try again", async () => {
    const households = householdsInMemory();
    households.failNextChange();

    render(<LandingPage households={households} onGo={() => {}} />);
    await pressCreate();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
    expect(screen.getByRole("button", { name: /create/i })).toBeEnabled();
  });

  it("passes on why a rate-limited creation was refused", async () => {
    const households = householdsInMemory();
    households.refuseNextChange(tooManyRequests);

    render(<LandingPage households={households} onGo={() => {}} />);
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

    render(<LandingPage households={householdsInMemory()} onGo={go} />);
    await userEvent.click(screen.getByRole("button", { name: /the khans/i }));

    expect(go).toHaveBeenCalledWith(`/${aSlug}`);
  });

  it("offers an unnamed one by its Slug", () => {
    remember({ slug: aSlug, name: null });

    render(<LandingPage households={householdsInMemory()} onGo={() => {}} />);

    expect(
      screen.getByRole("button", { name: new RegExp(aSlug) }),
    ).toBeInTheDocument();
  });

  it("offers nothing to reopen before any Household has been opened", () => {
    render(<LandingPage households={householdsInMemory()} onGo={() => {}} />);

    expect(
      screen.queryByRole("button", { name: /^open .+/i }),
    ).not.toBeInTheDocument();
  });

  it("waits to be asked, and never redirects on its own", () => {
    remember({ slug: aSlug, name: "The Khans" });
    const go = vi.fn();

    render(<LandingPage households={householdsInMemory()} onGo={go} />);

    expect(go).not.toHaveBeenCalled();
  });
});

describe("typing a Slug in", () => {
  it("opens the Household those four words name", async () => {
    const go = vi.fn();

    render(
      <LandingPage
        households={householdsInMemory({ slug: aSlug })}
        onGo={go}
      />,
    );
    await typeSlug("  Banana Apple DELICIOUS sauce  ");

    expect(go).toHaveBeenCalledWith(`/${aSlug}`);
  });

  it("says plainly when no Household answers to them", async () => {
    const go = vi.fn();

    render(<LandingPage households={householdsInMemory()} onGo={go} />);
    await typeSlug(aSlug);

    expect(await screen.findByRole("alert")).toHaveTextContent(/not found/i);
    expect(go).not.toHaveBeenCalled();
  });

  it("keeps the words exactly as they were typed so a typo can be fixed", async () => {
    const typed = "Banana Apple Delicious Sauce";

    render(<LandingPage households={householdsInMemory()} onGo={() => {}} />);
    await typeSlug(typed);

    await screen.findByRole("alert");
    expect(screen.getByLabelText(/four words/i)).toHaveValue(typed);
  });

  it("asks for all four words when fewer were typed", async () => {
    const households = householdsInMemory({ slug: aSlug });
    const opening = vi.spyOn(households, "open");
    const go = vi.fn();

    render(<LandingPage households={households} onGo={go} />);
    await typeSlug("banana apple delicious");

    expect(await screen.findByRole("alert")).toHaveTextContent(/four/i);
    expect(opening).not.toHaveBeenCalled();
    expect(go).not.toHaveBeenCalled();
  });

  it("says so when the lookup itself fails", async () => {
    const households = householdsInMemory({ slug: aSlug });
    households.failNextOpen();

    render(<LandingPage households={households} onGo={() => {}} />);
    await typeSlug(aSlug);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
  });
});
