# Playwright reports

Committed so the test evidence travels with the repository.

| Folder | Run against | Status |
|---|---|---|
| `local/` | Local production build (`next build && next start`) and a local Flask API on PostgreSQL 18, 2026-11-24 | 7 passed: 4 auth scenarios, the 8-step Kanban journey, 2 mobile layout checks |
| `production/` | **Not yet run.** Generate it against your Vercel and Railway URLs. | see below |

Open one with `npx playwright show-report e2e-report/local`.

## Produce the production report
```bash
cd frontend
PLAYWRIGHT_BASE_URL=https://<app>.vercel.app \
E2E_API_BASE_URL=https://<api>.up.railway.app/api \
PLAYWRIGHT_HTML_REPORT=e2e-report/production npx playwright test
```
The deliverable asks for a report from the **live** URL. The `local/` report proves the suite works, but it is not that evidence; replace it with `production/` after deploying.
