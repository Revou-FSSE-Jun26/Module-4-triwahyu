import { describe, expect, it } from "vitest";
import { isExpired, tokenExpiry } from "./session";

const b64url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const jwt = (payload: object) => `${b64url({ alg: "HS256" })}.${b64url(payload)}.signature`;

// REQ-AUTH-6: routing decisions use the token's exp claim (UX only; the API still verifies).
describe("session token helpers", () => {
  it("reads the exp claim", () => expect(tokenExpiry(jwt({ exp: 2000000000 }))).toBe(2000000000));
  it("returns null for malformed tokens", () => {
    expect(tokenExpiry("garbage")).toBeNull();
    expect(tokenExpiry(jwt({ sub: "no-exp" }))).toBeNull();
  });
  it("treats a past exp as expired and a future exp as valid", () => {
    expect(isExpired(jwt({ exp: 100 }), 200)).toBe(true);
    expect(isExpired(jwt({ exp: 300 }), 200)).toBe(false);
  });
  it("treats an unreadable token as expired", () => expect(isExpired("garbage")).toBe(true));
});
