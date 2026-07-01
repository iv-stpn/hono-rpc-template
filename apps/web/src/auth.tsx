// Auth state shared across routes. Holds the current user and exposes
// login/register/logout that call the typed RPC client.

import type { User } from "@app/utils";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { api, errorMessage } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on first load via the httpOnly cookie.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.api.auth.me.$get();
        if (active && res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const res = await api.api.auth.login.$post({ json: { email, password } });
    if (!res.ok) throw new Error(await errorMessage(res, "Login failed"));
    const data = await res.json();
    setUser(data.user);
  }

  async function register(email: string, password: string) {
    const res = await api.api.auth.register.$post({ json: { email, password } });
    if (!res.ok) throw new Error(await errorMessage(res, "Registration failed"));
    const data = await res.json();
    setUser(data.user);
  }

  async function logout() {
    await api.api.auth.logout.$post();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
