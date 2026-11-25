// Session cookie shared by the browser (AuthContext) and Server Components / middleware (FE-05).
// The cookie is readable by JS because Client Components must send the bearer token themselves.
// Risk accepted and documented in docs/adr/0003-session-storage.md: short token lifetime, no raw HTML rendering.
export const TOKEN_COOKIE = "revotask_token";

/** Decode the `exp` claim (seconds) without verifying the signature. For UX decisions only. */
export function tokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

export function isExpired(token: string, nowSeconds = Date.now() / 1000): boolean {
  const exp = tokenExpiry(token);
  return exp === null || exp <= nowSeconds;
}

export function writeTokenCookie(token: string, maxAgeSeconds: number): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE}=${token}; Path=/; Max-Age=${Math.floor(maxAgeSeconds)}; SameSite=Lax${secure}`;
}

export function clearTokenCookie(): void {
  document.cookie = `${TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
