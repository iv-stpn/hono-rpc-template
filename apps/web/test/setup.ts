import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom doesn't implement matchMedia. Stub it at module scope so it exists
// before any test module imports themeStore (which reads the OS preference at
// store-creation time).
vi.stubGlobal(
  "matchMedia",
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })),
);

// Unmount any rendered components and clear persisted state between tests.
afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.className = "";
});
