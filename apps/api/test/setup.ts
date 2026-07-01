import { vi } from "vitest";

// The worker loads Argon2 via WebAssembly at module load (see src/crypto.ts).
// In tests we don't need memory-hard hashing — swap the package for a cheap
// stand-in so importing the route/crypto modules never touches a .wasm file.
// The fake hash embeds the password (`$argon2id$test$<salt>$<password>`) so
// verifyPassword can confirm a correct vs. incorrect password without real KDF.
vi.mock("argon2-wasm-edge", () => ({
  setWASMModules: () => {},
  argon2id: async ({ password, salt }: { password: string; salt: Uint8Array }) => {
    const saltHex = [...salt].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `$argon2id$test$${saltHex}$${password}`;
  },
  argon2Verify: async ({ password, hash }: { password: string; hash: string }) => hash.endsWith(`$${password}`),
}));

// Wrangler turns these `.wasm` imports into WebAssembly.Module instances at
// build time; stub them so vitest never tries to fetch/compile the bytes.
vi.mock("argon2-wasm-edge/wasm/argon2.wasm", () => ({ default: {} }));
vi.mock("argon2-wasm-edge/wasm/blake2b.wasm", () => ({ default: {} }));
