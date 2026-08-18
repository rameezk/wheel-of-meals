import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useScrollLock } from "./scroll-lock";

afterEach(() => {
  document.body.removeAttribute("style");
  vi.restoreAllMocks();
});

describe("useScrollLock", () => {
  it("pins the document while the sheet is open", () => {
    vi.spyOn(window, "scrollY", "get").mockReturnValue(240);

    renderHook(() => useScrollLock());

    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-240px");
    expect(document.body.style.width).toBe("100%");
  });

  it("releases the document and restores the scroll position on unmount", () => {
    vi.spyOn(window, "scrollY", "get").mockReturnValue(240);
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    const { unmount } = renderHook(() => useScrollLock());
    unmount();

    expect(document.body.style.position).toBe("");
    expect(document.body.style.top).toBe("");
    expect(document.body.style.width).toBe("");
    expect(scrollTo).toHaveBeenCalledWith(0, 240);
  });

  it("gives back whatever inline styles the body already carried", () => {
    document.body.style.position = "relative";

    const { unmount } = renderHook(() => useScrollLock());
    unmount();

    expect(document.body.style.position).toBe("relative");
  });
});
