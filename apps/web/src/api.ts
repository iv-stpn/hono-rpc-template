// Typed RPC client. `AppType` comes from the backend's emitted declaration
// files (apps/api `build:types`), so route paths and payload shapes stay in
// sync without sharing source. The backend runs on its own origin, so point
// the client at API_URL and send credentials for the session cookie.

import type { AppType } from "@app/api";
import { hc } from "hono/client";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export const api = hc<AppType>(API_URL, { init: { credentials: "include" } });

// Pulls a human-readable message out of a failed response. The API returns
// either `{ error: string }` or a Zod validation error, so read defensively
// and fall back when no string message is present.
export async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
      return body.error;
    }
  } catch {
    // non-JSON body
  }
  return fallback;
}
