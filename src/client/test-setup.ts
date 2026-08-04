import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

let lessMotion = false;

export const asksForLessMotion = (wants: boolean) => {
  lessMotion = wants;
};

afterEach(() => asksForLessMotion(false));

window.matchMedia = (query: string) =>
  ({
    matches: lessMotion && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
