"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, request, setToken } from "./api";
import type { User } from "./types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type Session = {
  user: User | null;
  status: AuthStatus;
};

type AuthContextValue = Session & {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const anonymous: Session = { user: null, status: "anonymous" };

/**
 * Token lives in localStorage (simple, XSS-exposed — accepted trade-off, no
 * refresh tokens). On mount it is validated with GET /auth/me; every 401
 * on an authed request clears the session. A logged-out session is exactly
 * "the token is gone from storage" — the API is stateless.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, status: "loading" });

  useEffect(() => {
    // 401s from any authed request end the session.
    const onUnauthorized = () => setSession(anonymous);
    window.addEventListener("eventbook:unauthorized", onUnauthorized);
    return () => window.removeEventListener("eventbook:unauthorized", onUnauthorized);
  }, []);

  useEffect(() => {
    let active = true;
    const boot: Promise<Session> = getToken()
      ? request<{ user: User }>("/auth/me", { auth: true })
          .then((res): Session => ({ user: res.user, status: "authenticated" }))
          .catch((): Session => anonymous) // expired token already cleared the session above
      : Promise.resolve(anonymous);
    boot.then((next) => {
      if (active) setSession(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await request<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(res.token);
    setSession({ user: res.user, status: "authenticated" });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await request<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: { name, email, password },
    });
    setToken(res.token);
    setSession({ user: res.user, status: "authenticated" });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setSession(anonymous);
  }, []);

  return <AuthContext.Provider value={{ ...session, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/**
 * Guard for protected pages. Returns the state the page should react to:
 * "checking" (render a skeleton), "forbidden" (wrong role), "ok". Anonymous
 * visitors are redirected to /login?next=<current path>.
 */
export function useRequireAuth(role?: "admin"): "checking" | "forbidden" | "ok" {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?next=${next}`);
    }
  }, [status, router]);

  if (status === "loading") return "checking";
  if (status === "anonymous") return "checking"; // while the redirect runs, keep the skeleton
  if (role === "admin" && user?.role !== "admin") return "forbidden";
  return "ok";
}
