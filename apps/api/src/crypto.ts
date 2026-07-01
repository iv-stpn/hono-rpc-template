// Password hashing (Argon2id) + session token helpers.
//
// Argon2 runs as WebAssembly via `argon2-wasm-edge`, which works in the
// Cloudflare Workers runtime. Wrangler bundles the `.wasm` imports below as
// WebAssembly.Module instances; we register them once at module load so the
// argon2 helpers can instantiate the compiled modules without a network fetch.

import { argon2id, argon2Verify, setWASMModules } from "argon2-wasm-edge";
import argon2WASM from "argon2-wasm-edge/wasm/argon2.wasm";
import blake2bWASM from "argon2-wasm-edge/wasm/blake2b.wasm";
import { generateSnowflake } from "./snowflake";

setWASMModules({ argon2WASM, blake2bWASM });

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Argon2id parameters. Tuned to be fast enough for the Workers CPU limit
// while still memory-hard. See RFC 9106 for parameter guidance.
const ARGON2_PARAMS = {
  parallelism: 1,
  iterations: 256,
  memorySize: 512, // KiB
  hashLength: 32, // bytes
  outputType: "encoded" as const, // standard `$argon2id$...` string, self-describing for verify
};

// Argon2id password hashing. Returns a self-describing encoded string that
// embeds the salt and parameters, so verification needs no extra state.
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return argon2id({ ...ARGON2_PARAMS, password, salt });
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash: stored });
  } catch {
    // Stored value isn't a valid argon2 encoded string (e.g. corrupt row).
    return false;
  }
}

export function newId(): string {
  return generateSnowflake();
}

export function newToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}
