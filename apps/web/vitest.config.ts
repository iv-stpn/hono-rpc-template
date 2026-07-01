import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Runs the web app's tests in jsdom, reusing the React + Tailwind vite config.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./test/setup.ts"],
      include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    },
  }),
);
