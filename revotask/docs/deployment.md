# Deployment Guide (Vercel API + Vercel web)

> **Status.** The configuration below is committed and was exercised locally: migrations on PostgreSQL 18, a production-mode import of `wsgi.py`, health, register and login, and the whole backend suite on PostgreSQL with the serverless settings (`VERCEL=1`). The deployments themselves, the Postman capture, the live Playwright run and the live screenshots need your Vercel account and a hosted database, and are **not done**. The checklist at the end is what remains. Background and trade-offs: [`docs/adr/0004-backend-on-vercel.md`](adr/0004-backend-on-vercel.md).

You create **two Vercel projects from the same repository**: one with Root Directory `backend` (the API) and one with Root Directory `frontend` (the web app).

## 1. PostgreSQL

Vercel does not host a database. Create one with a provider such as a Vercel Marketplace database (for example Neon) or Supabase, and copy its connection string.

- Prefer the provider's **pooled** connection string for the app. The API opens a connection per request (see ADR 0004), and a pooler keeps that cheap.
- Add `?sslmode=require` if the provider requires TLS.
- `postgres://` and `postgresql://` URLs are rewritten to the psycopg 3 driver automatically.
- For migrations (step 2), a **direct** (unpooled) connection is the safer choice if your provider offers one.

## 2. Apply the migrations (from your machine)

Nothing runs `flask db upgrade` on Vercel, so run it yourself before the first deploy and after every new migration:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
$env:DATABASE_URL = "<production connection string>"
flask db upgrade
flask db check          # should print: No new upgrade operations detected.
```

(macOS or Linux: `export DATABASE_URL="..."`.) Do not run migrations in a Vercel build step: preview deployments would then be able to change the production schema. If you prefer automation, run the same command from a CI job that holds the production URL as a secret.

## 3. The API project

1. In Vercel: **Add New → Project**, import the repository, set **Root Directory = `backend`**. Vercel detects the Flask app from `backend/wsgi.py`, and Python 3.12 from `backend/.python-version`.
2. Set these environment variables (Production, and Preview if you use previews):

| Variable                   | Value                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `APP_ENV`                  | `production`                                                                                           |
| `SECRET_KEY`               | 48+ random characters: `python -c "import secrets; print(secrets.token_urlsafe(48))"`                  |
| `JWT_SECRET_KEY`           | a different random value of the same kind                                                              |
| `DATABASE_URL`             | the connection string from step 1                                                                      |
| `CORS_ORIGINS`             | your web app's URL, for example `https://revotask.vercel.app` (no trailing slash; comma-separate more) |
| `JWT_ACCESS_TOKEN_MINUTES` | `60` (optional)                                                                                        |

`VERCEL=1` is set by Vercel itself, and it is what switches the database engine to per-request connections. You do not set it.

3. Deploy. Your API URL is `https://<api-project>.vercel.app`.

In production the app **refuses to start** if either secret is missing or shorter than 32 characters. On Vercel that shows up as a failed function: open **Runtime Logs** to read the message.

### Verify the API

```powershell
python scripts/api_smoke.py https://<api-project>.vercel.app/api
```

All 30 steps should print `PASS` and the last line should read `Blueprints reached: 8/8`.

For the Postman screenshot, import `docs/postman/revotask.postman_collection.json`, set the `baseUrl` collection variable to `https://<api-project>.vercel.app/api`, and run the collection. The first requests are `GET /health` (200), `POST /auth/register` (201) and `POST /auth/login` (200); every response uses the `{ "data": ... }` or `{ "error": "..." }` envelope.

## 4. The web project

1. **Add New → Project**, import the same repository, set **Root Directory = `frontend`**. Framework preset: Next.js.
2. Environment variables:

| Variable                   | Value                                      |
| -------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_API_BASE_URL` | `https://<api-project>.vercel.app/api`     |
| `API_BASE_URL`             | the same value (used by Server Components) |

`NEXT_PUBLIC_` values are baked in at build time, so **redeploy after changing them**. 3. Deploy, then copy the web URL into the API project's `CORS_ORIGINS` and redeploy the API.

## 5. Run Playwright against production

```bash
cd frontend
npm ci
npx playwright install chromium
PLAYWRIGHT_BASE_URL=https://<web-project>.vercel.app \
E2E_API_BASE_URL=https://<api-project>.vercel.app/api \
PLAYWRIGHT_HTML_REPORT=e2e-report/production \
npx playwright test
npx playwright show-report e2e-report/production
```

PowerShell: set the three variables with `$env:NAME = "value"` first. The suite creates uniquely named users and boards, so it is safe to repeat. Commit `frontend/e2e-report/production/` as the required test report.

## 6. Common problems

| Symptom                                                                    | Cause and fix                                                                                                                                           |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every API call returns a Vercel error page or `FUNCTION_INVOCATION_FAILED` | The app failed while importing. Open Runtime Logs. The usual cause is a missing or short `SECRET_KEY` or `JWT_SECRET_KEY`, or a missing `DATABASE_URL`. |
| Browser console shows a CORS error                                         | `CORS_ORIGINS` does not exactly match the web origin (scheme, host, no trailing slash). Preview deployments have their own URLs and will not match.     |
| `relation "users" does not exist` in the logs                              | Migrations were not applied to this database. Run step 2 against the same `DATABASE_URL`.                                                               |
| `too many connections` or `remaining connection slots are reserved`        | You are using the direct connection string. Switch the app's `DATABASE_URL` to the provider's pooled one.                                               |
| `prepared statement ... does not exist`                                    | Something overrode the engine options. `VERCEL=1` must be present at runtime; do not set `SQLALCHEMY_ENGINE_OPTIONS` elsewhere.                         |
| `ModuleNotFoundError: psycopg2`                                            | `DATABASE_URL` was overridden with a driver-specific value. Use the plain provider URL; the app adds `+psycopg`.                                        |
| Pages redirect to `/login` right after signing in                          | Check that `NEXT_PUBLIC_API_BASE_URL` ends in `/api` and that the login response in the Network tab contains `access_token`.                            |
| Server pages fail but client calls work                                    | `API_BASE_URL` is missing on the web project.                                                                                                           |
| First request after a quiet period is slow                                 | Cold start. Expected on serverless; the notification poll will occasionally be slower.                                                                  |

## Remaining checklist (needs your accounts)

- [ ] Hosted PostgreSQL created and migrations applied (`flask db upgrade`, then `flask db check`)
- [ ] API project deployed; `GET /api/health` returns 200
- [ ] `scripts/api_smoke.py` passes against the API (30/30, 8/8 blueprints)
- [ ] Postman: register and login succeed; all eight blueprints reachable (screenshot)
- [ ] Web project deployed and connected to the API
- [ ] Playwright passes against the live URL; report committed to `frontend/e2e-report/production/`
- [ ] Live screenshots captured into `docs/screenshots/live/` (desktop and mobile device mode)
