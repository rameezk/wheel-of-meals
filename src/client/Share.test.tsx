import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "./Share";
import { shareConfirmMillis } from "./motion";

const shareOrCopy = vi.hoisted(() => vi.fn());

vi.mock("./sharing", async (whole) => ({
  ...(await whole<typeof import("./sharing")>()),
  shareOrCopy,
}));

beforeEach(() => shareOrCopy.mockReset().mockResolvedValue("shared"));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const aShareable = { title: "The Week", text: "Sunday: Lasagne" };

const showTheControl = () =>
  render(<ShareButton label="Share the Week" shareable={aShareable} />);

const theControl = () => screen.getByRole("button", { name: "Share the Week" });

const shareIt = () => userEvent.click(theControl());

const press = () =>
  act(async () => {
    fireEvent.click(theControl());
    await Promise.resolve();
  });

const wait = (millis: number) => act(() => vi.advanceTimersByTimeAsync(millis));

const confirmation = () =>
  document.querySelector("[aria-live]")?.textContent ?? null;

describe("a share control", () => {
  it("hands over what it was given to share", async () => {
    showTheControl();

    await shareIt();

    expect(shareOrCopy).toHaveBeenCalledWith(aShareable);
  });

  it("keeps quiet until it is pressed", () => {
    showTheControl();

    expect(confirmation()).toBe("");
  });

  it("wears the share Icon beside its label, not instead of it", () => {
    showTheControl();

    const icon = theControl().querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(theControl()).toHaveAccessibleName("Share the Week");
  });

  it("confirms that the share sheet took it", async () => {
    showTheControl();

    await shareIt();

    expect(confirmation()).toMatch(/shared/i);
  });

  it("says the clipboard holds it, so nobody pastes an empty clipboard", async () => {
    shareOrCopy.mockResolvedValue("copied");
    showTheControl();

    await shareIt();

    expect(confirmation()).toMatch(/copied/i);
  });

  it("says nothing at all when the share sheet is dismissed", async () => {
    shareOrCopy.mockResolvedValue("cancelled");
    showTheControl();

    await shareIt();

    expect(confirmation()).toBe("");
  });

  it("owns up rather than leaving an empty clipboard unmentioned", async () => {
    shareOrCopy.mockResolvedValue("failed");
    showTheControl();

    await shareIt();

    expect(confirmation()).toMatch(/nothing was (shared|copied)/i);
  });

  it("opens one share sheet, however impatiently it is pressed", async () => {
    let handOver = () => {};
    shareOrCopy.mockReturnValue(
      new Promise((resolve) => {
        handOver = () => resolve("shared");
      }),
    );
    showTheControl();

    await press();
    expect(theControl()).toBeDisabled();
    await press();

    await act(async () => {
      handOver();
      await Promise.resolve();
    });

    expect(shareOrCopy).toHaveBeenCalledTimes(1);
    expect(theControl()).toBeEnabled();
  });

  it("stops confirming once the confirmation has been read", async () => {
    vi.useFakeTimers();
    showTheControl();

    await press();
    expect(confirmation()).toMatch(/shared/i);

    await wait(shareConfirmMillis);

    expect(confirmation()).toBe("");
  });

  it("confirms again on a second press, rather than staying quiet", async () => {
    vi.useFakeTimers();
    showTheControl();

    await press();
    await wait(shareConfirmMillis - 1);
    await press();
    await wait(1);

    expect(confirmation()).toMatch(/shared/i);
  });
});
