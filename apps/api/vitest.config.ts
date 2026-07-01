import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // The shared packages ship TS source via their `exports` map, but their
      // subpath imports (e.g. `@app/schemas/auth`) aren't listed in `exports`,
      // so point vitest straight at the source files.
      "@app/schemas": path.resolve(here, "../../packages/schemas/src"),
      "@app/utils": path.resolve(here, "../../packages/utils/src"),
    },
  },
});
