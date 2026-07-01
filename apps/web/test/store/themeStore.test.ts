import { describe, expect, it, vi } from "vitest";
import { initialTheme, useThemeStore } from "../../src/store/themeStore";

describe("initialTheme", () => {
  it("defaults to light when nothing is stored and the OS prefers light", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false, media: "(prefers-color-scheme: dark)" }));
    expect(initialTheme()).toBe("light");
  });

  it("follows the OS dark preference when nothing is stored", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true, media: "(prefers-color-scheme: dark)" }));
    expect(initialTheme()).toBe("dark");
  });

  it("uses the persisted choice over the OS preference", () => {
    localStorage.setItem("theme", "dark");
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false, media: "(prefers-color-scheme: dark)" }));
    expect(initialTheme()).toBe("dark");
  });
});

describe("useThemeStore", () => {
  it("setTheme persists to localStorage and toggles the html class", () => {
    useThemeStore.getState().setTheme("dark");
    expect(useThemeStore.getState().theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    useThemeStore.getState().setTheme("light");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggle flips between light and dark", () => {
    useThemeStore.getState().setTheme("light");
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().theme).toBe("dark");
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().theme).toBe("light");
  });
});
