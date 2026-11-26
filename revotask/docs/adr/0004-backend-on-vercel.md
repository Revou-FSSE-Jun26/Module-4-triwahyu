# ADR 0004: Deploy the Flask API to Vercel as a serverless function

- Status: Accepted
- Related: guideline DB-10, BE-10, `REQ-FND-3`, `REQ-FND-8`
- Supersedes: the earlier plan to run the API under Gunicorn on a container platform (Railway, then Helipod)

## Context
The web app is on Vercel, and Vercel's Python runtime can run a Flask app. Vercel finds a Flask instance named `app` in one of several entrypoint files; `backend/wsgi.py` already exports one. The app becomes a single Vercel Function, so there is no Gunicorn, no `$PORT` and no start command in which to run migrations.

## Decision
- The Vercel project for the API uses **Root Directory = `backend`** and the existing `wsgi.py` entrypoint. Python is pinned by `backend/.python-version` (3.12).
- The database is an external PostgreSQL (for example from the Vercel Marketplace, or Supabase). Vercel does not host one.
- **Migrations run outside the deploy** (`flask db upgrade` from a developer machine or a CI job holding the production URL). They are not run at build time, because preview deployments would then be able to migrate the production database.
- `config.py` reads Vercel's `VERCEL=1` variable and switches the SQLAlchemy engine to `NullPool`, and for PostgreSQL passes `prepare_threshold=None` to psycopg. Every other environment keeps `pool_pre_ping` and the default pool (`engine_options()`).
- `backend/railway.json` was deleted; `backend/.vercelignore` keeps the virtualenv, tests and local databases out of the upload.

## Consequences
- Each function instance would otherwise keep its own connection pool and exhaust the database's connection limit, so connections are opened per request. The full backend suite passes on PostgreSQL 18 in both modes (114 tests), but it runs about two and a half times slower with `NullPool` (176 s against 71 s), and each request pays for a new connection. Use the provider's **pooled** connection string to keep that cost low.
- psycopg 3 server-side prepared statements break behind transaction-mode poolers such as PgBouncer, which is why they are disabled on Vercel.
- The 30-second notification poll can hit a cold function, so an occasional poll will be slower.
- Request and response bodies are limited to 4.5 MB by Vercel; the API caps request bodies at 1 MB.
- `requirements.txt` still contains the test and lint tools. The brief asks for `pip install -r requirements.txt` followed by `pytest -v`, and the size saving of a split is small.

## Not verified
The deployment itself. It follows Vercel's Flask documentation (page last updated 2026-11-14) but has not been run on a Vercel account, so the first deploy is the real test.
