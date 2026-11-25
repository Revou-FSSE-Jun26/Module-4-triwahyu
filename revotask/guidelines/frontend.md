# Frontend Guidelines

Scope: everything under `frontend/src/` and `frontend/e2e/`.
Every guideline has a **Rule**, a **Rationale**, and a concrete RevoTask **Example**.
Rule IDs (`FE-xx`) are referenced by `scripts/check_guidelines.py` and the violation report.
Ownership: this file owns UI, client state, browser security and Playwright. Server-side validation and secrets live in `backend.md`.

## FE-01 Use strict TypeScript and name your types

**Rule:** `tsconfig.json` keeps `"strict": true`. Do not use `any`. API payload types live in `src/types/index.ts` and are the only source of response shapes.
**Rationale:** A type error at build time is cheaper than a runtime crash on a board with 200 cards.
**Example:** `Card`, `Column`, `BoardDetail` and `Comment` are declared once in `types/index.ts` and imported everywhere.

## FE-02 Send every HTTP request through `lib/apiClient.ts`

**Rule:** Only `lib/apiClient.ts` calls `fetch`. Components use the typed methods from `lib/api.ts`. The client reads `NEXT_PUBLIC_API_BASE_URL` in the browser and `API_BASE_URL` on the server, attaches `Authorization: Bearer <token>`, and throws `ApiError` with `statusCode` and `message` on any non-2xx or network failure.
**Rationale:** Token handling and error mapping stay consistent when they exist in one place.
**Example:** `BoardView` calls `api.cards.move(...)`; a search for `fetch(` outside `apiClient.ts` finds nothing.

## FE-03 Use the shared components for repeated UI

**Rule:** Buttons use `BaseButton`, status labels use `BaseBadge`, and every dialog and in-app form is wrapped in `BaseModal`. Pages and feature components contain no raw `<button>` elements. `BaseButton` defaults to `type="button"`. Variant, size and alignment are props (`variant`, `size`, `align`); never override them through `className`, because Tailwind resolves conflicting utilities by stylesheet order, not by their order in the class string.
**Rationale:** One component carries the focus ring, hit-target size, and disabled behaviour for the whole product.
**Example:** My Tasks renders `<BaseButton href={...} variant="secondary">Open board</BaseButton>`; Profile's save action is `<BaseButton type="submit">`. A card title button is `<BaseButton variant="ghost" size="card" align="start">`, not `className="justify-start px-2"` (the first attempt at that was silently ignored and centered every title).

## FE-04 Render on the server by default

**Rule:** Pages are Server Components that fetch their own data. Add `"use client"` only to leaf components that need state, effects, or browser APIs. A Server Component passes plain serializable props to a client component.
**Rationale:** Server rendering sends data with the first response and keeps the bundle small.
**Example:** `app/page.tsx` (Dashboard) and `app/boards/[id]/page.tsx` fetch on the server; `BoardView.tsx` is the client boundary.

## FE-05 Keep the session in AuthContext and protect routes twice

**Rule:** The JWT lives in `AuthContext`, mirrored in a `SameSite=Lax` cookie so Server Components can read it. `middleware.ts` redirects unauthenticated requests for protected paths to `/login`. A 401 from the API clears the session and returns the user to `/login`.
**Rationale:** Client navigation guards are a convenience, and the backend remains the real authority.
**Example:** Visiting `/my-tasks` while signed out lands on `/login?next=%2Fmy-tasks`.

## FE-06 Apply optimistic updates only with rollback

**Rule:** A mutation that updates state before the server answers must snapshot the previous state and restore it, with an error toast, when the request fails.
**Rationale:** The interface should feel instant without ever showing data the server rejected.
**Example:** `useDragAndDrop` moves the card at once, calls `PATCH /api/cards/<id>/position`, and puts the card back in its original column and slot on failure.

## FE-07 Map ApiError status codes to user-facing messages

**Rule:** UI code reports failures through `useErrorHandler`, which maps `ApiError.statusCode` to a fixed, friendly toast (network, 400, 401, 403, 404, 409, 429, 5xx). It never shows a raw exception, stack trace, or an unknown error's `message`.
**Rationale:** Users need to know what to do next, and raw messages leak internals or confuse.
**Example:** A 403 on `PATCH /api/comments/<id>` toasts "You don't have permission to do that." A 500 toasts "Something went wrong on our side."

## FE-08 Build forms with controlled inputs and client validation

**Rule:** Form fields are controlled, validated on blur and submit by functions in `lib/validation.ts`, disabled while submitting, and show the error beside the field. Client validation is a convenience only. Server errors from `details` are shown on the matching field.
**Rationale:** Immediate feedback reduces failed requests, and the server stays authoritative.
**Example:** The register form blocks a password shorter than 8 characters before the request, and still displays the server's 409 "Email is already registered" under the email field.

## FE-09 Make every interaction accessible

**Rule:** Every input has a visible `<label>`. Dialogs use `role="dialog"`, `aria-modal`, a unique `aria-labelledby`, close on Escape, and return focus when closed. Icon-only buttons have an `aria-label`. Anything doable by drag has a keyboard alternative.
**Rationale:** Keyboard and screen-reader users must be able to finish every task, and drag-and-drop alone excludes them.
**Example:** The card modal has a "Move to column" select that uses the same optimistic move as dragging.

## FE-10 Design mobile first and never overflow the viewport

**Rule:** Layouts start at 360 px wide. Tap targets are at least 44 px. The Kanban board scrolls horizontally inside its own container, and the page itself never scrolls sideways. Modals scroll internally (`max-h-[90vh] overflow-y-auto`).
**Rationale:** The live app must be usable on a phone without clipped or overlapping content.
**Example:** At 390 px the board shows one column at a time with horizontal snap-scrolling; `e2e/responsive.spec.ts` asserts no horizontal page overflow.

## FE-11 Expose only public values to the browser

**Rule:** Only `NEXT_PUBLIC_*` variables reach client code, and none of them is a secret. Never render user content with `dangerouslySetInnerHTML`.
**Rationale:** Everything in the browser bundle is public, and unescaped HTML is the main route to stored XSS in comments.
**Example:** Comments render as plain text children; the base URL is the only `NEXT_PUBLIC_` value.

## FE-12 Own side effects and clean them up

**Rule:** Hooks that poll, listen, or set timers start them in `useEffect` and always return a cleanup. Polling never overlaps (skip a tick while a request is in flight), and debounced input uses `useDebouncedValue`.
**Rationale:** Leaked timers keep firing after navigation and flood the API.
**Example:** `useNotifications` polls every 30 s, skips a tick while a request is pending, and clears its interval on unmount. Card search waits 300 ms after the last keystroke.

## FE-13 Style from design tokens

**Rule:** Colours, shadows, radii and fonts come from the Tailwind theme in `tailwind.config.ts` (ink, paper, concrete, signal), mirroring `docs/design-system/`. No hex literals in components. Show at most one primary (orange) action per view. Text on orange is ink, never white.
**Rationale:** Tokens keep the product visually consistent and let contrast be checked once.
**Example:** `BaseButton` uses `bg-signal-500 text-ink shadow-key`, not `#FF5A1F`.

## FE-14 Write Playwright tests that wait on conditions

**Rule:** E2E tests use web-first assertions (`expect(locator)...`), role or label locators, and `waitForResponse` for network effects. `waitForTimeout` is forbidden. Every test asserts something, and each run creates its own uniquely named data.
**Rationale:** Fixed sleeps are slow and flaky, and a test with no assertion cannot fail.
**Example:** After a drag, the test waits for the `PATCH .../position` response, reloads, and asserts the card is still in the new column.
