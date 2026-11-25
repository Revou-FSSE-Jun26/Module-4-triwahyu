# Authentication and Users: Refinement Changelog

## R11 · Registration confirmed success twice

- **Artifact reviewed:** `frontend/src/components/auth/RegisterForm.tsx` and the Kanban journey test (first draft)
- **Before:** After a successful registration the form showed a toast ("Account created. Please sign in.") and, after the redirect, the login page showed the same message as an inline banner. The Playwright locator `getByRole("status")` matched both and failed with a strict-mode violation. The duplication was also poor UX: two announcements for one event.
- **Refinement prompt:** "Show exactly one success message. Keep the persistent inline banner on `/login?registered=1` because it survives the redirect; remove the toast."
- **After:** One `role="status"` message; the test asserts its exact text.
- **Evidence:** `frontend/e2e/kanban.spec.ts` step 1 passes; `RegisterForm.test.tsx` (6 tests) asserts the redirect target.
- **Guideline:** FE-08

See also R01, R02, R05 and R10 in `00-foundation/CHANGELOG.md`, which changed the auth responses, secrets handling, error toasts, and the test setup used by this slice.
