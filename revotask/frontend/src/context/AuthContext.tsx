"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createApi, type Api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import {
  clearTokenCookie,
  isExpired,
  tokenExpiry,
  writeTokenCookie,
} from "@/lib/session";
import type { LoginResult, User } from "@/types";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  /** True while a stored token is being validated by GET /users/me. */
  loading: boolean;
  api: Api;
  login: (result: LoginResult) => void;
  logout: (options?: { redirect?: boolean; reason?: "expired" }) => void;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type Props = { children: ReactNode; initialToken?: string | null };

export function AuthProvider({ children, initialToken = null }: Props) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(
    initialToken && !isExpired(initialToken) ? initialToken : null,
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(token));
  const api = useMemo(() => createApi(token), [token]);

  const logout = useCallback<AuthContextValue["logout"]>(
    ({ redirect = true, reason } = {}) => {
      clearTokenCookie();
      setToken(null);
      setUser(null);
      setLoading(false);
      if (redirect)
        router.replace(reason === "expired" ? "/login?expired=1" : "/login");
    },
    [router],
  );

  const login = useCallback((result: LoginResult) => {
    writeTokenCookie(result.access_token, result.expires_in);
    setToken(result.access_token);
    setUser(result.user);
    setLoading(false);
  }, []);

  // Validate a restored session and load the profile. A 401 means the token is no longer good.
  useEffect(() => {
    if (!token || user) return;
    let cancelled = false;
    createApi(token)
      .users.me()
      .then((profile) => !cancelled && setUser(profile))
      .catch((error: unknown) => {
        if (!cancelled && isApiError(error) && error.statusCode === 401)
          logout({ reason: "expired" });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, user, logout]);

  // Sign out automatically when the token expires while the tab stays open.
  useEffect(() => {
    const exp = token ? tokenExpiry(token) : null;
    if (!exp) return;
    const timer = window.setTimeout(
      () => logout({ reason: "expired" }),
      Math.max(0, exp * 1000 - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [token, logout]);

  const value = useMemo(
    () => ({ token, user, loading, api, login, logout, setUser }),
    [token, user, loading, api, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
