# Canonical Technology Stack

- Frontend: Next.js 15 App Router, React 19, TypeScript (strict), Tailwind CSS 3, react-hot-toast.
- Backend: Python 3.12 on Vercel (3.11+ supported locally), Flask 3, SQLAlchemy 2, Flask-Migrate, Flask-JWT-Extended, Marshmallow 4, Werkzeug scrypt hashing, python-dotenv, Gunicorn (optional, for non-serverless hosts).
- Database: PostgreSQL 16 or newer. SQLite is used only for the fast default pytest run.
- Tests: pytest, Vitest with React Testing Library, Playwright (run against a production build or a deployed URL, never the dev server).
- Lint and format: ruff (Python), ESLint flat config and Prettier at 120 columns (frontend).
- Deployment targets: Vercel for both projects: the Flask API as a Vercel Function (root directory `backend`, entrypoint `backend/wsgi.py`) and Next.js (root directory `frontend`), plus an external PostgreSQL. See `docs/adr/0004-backend-on-vercel.md`.
- API base URL: `API_BASE_URL` for Server Components; `NEXT_PUBLIC_API_BASE_URL` in the browser. Both end in `/api`.
- Keep dependency versions bounded in the manifest and review upgrades deliberately.
