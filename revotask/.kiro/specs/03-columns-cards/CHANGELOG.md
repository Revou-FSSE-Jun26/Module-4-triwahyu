# Columns and Cards: Refinement Changelog

## R12 · A page file exported a helper

- **Artifact reviewed:** `frontend/src/app/my-tasks/page.tsx` (first draft)
- **Before:** `groupByBoard()` was exported from the page module. Next.js only allows specific exports from a `page.tsx` (`default`, `metadata`, ...), so `next build` would have rejected it, and the function could not be unit-tested without importing a Server Component.
- **Refinement prompt:** "Move `groupByBoard` to `lib/tasks.ts`, keep the page as a thin Server Component, and test the grouping."
- **After:** `lib/tasks.ts` with three tests; the page imports it.
- **Evidence:** `frontend/src/lib/tasks.test.ts`; `next build` succeeds for all seven routes.
- **Guideline:** FE-04

See also R07 (BaseButton) and R10 (E2E setup) in `00-foundation/CHANGELOG.md`.
