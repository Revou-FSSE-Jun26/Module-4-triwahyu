# ADR 0003: Keep the JWT in AuthContext, mirrored in a SameSite cookie

- Status: Accepted, with a documented risk
- Related: guideline FE-05, FE-11, `REQ-AUTH-6`, `REQ-AUTH-7`

## Context
The assignment requires the token to live in `AuthContext` and the API client to attach `Authorization: Bearer <token>`. It also requires the Dashboard and Board Detail to be Server Components that fetch from the API. A Server Component cannot read React state, so it needs the token from the request itself. The scaffold warned against `localStorage` without a security review.

## Decision
- The token is held in `AuthContext` for Client Components.
- It is mirrored in a cookie `revotask_token` (`Path=/`, `SameSite=Lax`, `Secure` on HTTPS, `Max-Age` equal to the token lifetime). The root layout reads it with `cookies()` and passes it to `AuthProvider`; `middleware.ts` and Server Components read the same cookie.
- The cookie is **not** `HttpOnly`, because browser code must be able to send the bearer header to the API directly.
- A 401 from the API clears the cookie and state and redirects to `/login`.

## Risk accepted
Any script that runs on the page can read the cookie, exactly as it could read `localStorage`. This design does not remove XSS exposure.

## Mitigations in place
- Access tokens expire (60 minutes by default) and the app signs out at expiry.
- User content is rendered as text only; `dangerouslySetInnerHTML` is banned by ESLint and by `check_guidelines.py` (FE-11), with a test that markup in a comment stays inert.
- `SameSite=Lax` limits cross-site sends; the API uses bearer headers, not cookies, so cookie-based CSRF does not apply to it.
- The API authorizes every request itself; middleware is only a convenience.

## Alternative for a later release
A Backend-for-Frontend: Next.js Route Handlers set an `HttpOnly` cookie and proxy API calls, so the token never reaches browser JavaScript. It removes the XSS exposure at the cost of an extra hop and a deviation from the assignment's direct client-to-API design.
