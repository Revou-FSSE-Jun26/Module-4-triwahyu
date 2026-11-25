# Deployment Guide (Helipod API + Vercel web)

> **Status.** The configuration below is committed and was exercised locally against PostgreSQL 18 (migrations, a production-mode import of `wsgi.py`, health, register and login). The deployments themselves, the Postman capture, the live Playwright run and the live screenshots need your Helipod and Vercel accounts and are **not done**. The checklist at the end is what remains.

## 1. Flask API on Helipod

1. Push the repository to GitHub.
2. In Helipod: **New Project → Deploy from GitHub repo**, then **Settings → Root Directory = `backend`**.
3. **Add a PostgreSQL database** to the project. Helipod exposes `DATABASE_URL`; reference it from the API service using the database's connection URL. `postgres://` and `postgresql://` URLs are normalized for psycopg 3 automatically. If your plan requires TLS, append `?sslmode=require`.
4. Set these variables on the API service:

| Variable | Value |
|---|---|
| `APP_ENV` | `production` |
| `SECRET_KEY` | 48+ random characters: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `JWT_SECRET_KEY` | a different random value of the same kind |
| `DATABASE_URL` | the Helipod database connection URL |
| `CORS_ORIGINS` | your Vercel URL, for example `https://revotask.vercel.app` (no trailing slash; comma-separate more) |
| `JWT_ACCESS_TOKEN_MINUTES` | `60` (optional) |

In production the app **refuses to start** if either secret is missing or shorter than 32 characters.

5. `backend/railway.json` runs `flask --app wsgi:app db upgrade` and then `gunicorn wsgi:app` on `$PORT`, with `/api/health` as the health check. So **every deploy applies migrations before serving**.
6. **Settings → Networking → Generate Domain.** Your API URL is `https://<helipod-api-host>`.

### Verify the API (Postman)
Import `docs/postman/revotask.postman_collection.json`, set `baseUrl` to `https://<helipod-api-host>/api`, then run in order:

1. `GET {{baseUrl}}/health` → `200 {"data":{"status":"ok","database":"up"}}`
2. `POST {{baseUrl}}/auth/register` → `201`
3. `POST {{baseUrl}}/auth/login` → `200`, the collection stores the token
4. Run the remaining folders (boards, columns, cards, comments, notifications, analytics, users). Each returns the `{ "data": ... }` or `{ "error": ... }` envelope.

Screenshot the runner showing all folders green for the README.

## 2. Next.js on Vercel

1. In Vercel: **Add New → Project**, import the repo, set **Root Directory = `frontend`**. Framework preset: Next.js.
2. Environment variables (Production and Preview):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://<helipod-api-host>/api` |
| `API_BASE_URL` | the same value (used by Server Components) |

`NEXT_PUBLIC_` values are baked in at build time, so **redeploy after changing them**.
3. Deploy, then copy the Vercel URL into the API's `CORS_ORIGINS` and redeploy the API.

## 3. Run the Playwright suite against production

```bash
cd frontend
npm ci
npx playwright install chromium
PLAYWRIGHT_BASE_URL=https://<app>.vercel.app \
E2E_API_BASE_URL=https://<helipod-api-host>/api \
PLAYWRIGHT_HTML_REPORT=e2e-report/production \
npx playwright test
npx playwright show-report e2e-report/production
```

PowerShell: set the three variables with `$env:NAME = "value"` first. The suite creates uniquely named users and boards, so it is safe to repeat. Commit `frontend/e2e-report/production/` as the required test report.

## 4. Common problems
| Symptom | Cause and fix |
|---|---|
| Browser console shows a CORS error | `CORS_ORIGINS` does not exactly match the Vercel origin (scheme, host, no trailing slash). Fix and redeploy the API. |
| API crashes at start with `SECRET_KEY must be set...` | Production secrets are missing or under 32 characters. |
| `ModuleNotFoundError: psycopg2` | `DATABASE_URL` was overridden with a driver-specific value. Use the plain Helipod URL; the app adds `+psycopg`. |
| Pages redirect to `/login` right after signing in | The API and web are on different hosts; confirm `NEXT_PUBLIC_API_BASE_URL` ends in `/api` and the API returns the token (check the Network tab). |
| Server pages fail but client calls work | `API_BASE_URL` is missing on Vercel. |

## Remaining checklist (needs your accounts)
- [ ] API deployed; `GET /api/health` returns 200
- [ ] Postman: register and login succeed; all eight blueprints reachable (screenshot)
- [ ] Web deployed and connected to the API
- [ ] Playwright passes against the live URL; report committed to `frontend/e2e-report/production/`
- [ ] Live screenshots captured into `docs/screenshots/` (desktop and mobile device mode)
