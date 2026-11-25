# Authentication and Users: Tasks

## Backend

- [x] **T-AUTH-1** `POST /api/auth/register` with hashing, lower-casing and welcome notification. _(REQ-AUTH-1, REQ-AUTH-2)_ → `backend/app/blueprints/auth/{routes,service,schema}.py`, `tests/test_auth.py`
- [x] **T-AUTH-2** `POST /api/auth/login` returning a JWT with expiry and a generic failure. _(REQ-AUTH-3, REQ-AUTH-4)_ → same files
- [x] **T-AUTH-3** `GET /api/users/me`. _(REQ-USER-1)_ → `backend/app/blueprints/users/{routes,service,schema}.py`, `tests/test_users.py`
- [x] **T-AUTH-4** `PATCH /api/users/me` rejecting `password`. _(REQ-USER-2, REQ-USER-3)_ → same files

## Frontend

- [x] **T-AUTH-5** `/register` page and form with client validation. _(REQ-AUTH-5)_ → `frontend/src/app/register/page.tsx`, `components/auth/RegisterForm.tsx`, `lib/validation.ts`, `RegisterForm.test.tsx`
- [x] **T-AUTH-6** `/login` page and form; token in `AuthContext`. _(REQ-AUTH-6)_ → `frontend/src/app/login/page.tsx`, `components/auth/LoginForm.tsx`, `context/AuthContext.tsx`, `lib/session.ts`
- [x] **T-AUTH-7** Route protection middleware and server-side 401 handling. _(REQ-AUTH-7)_ → `frontend/src/middleware.ts`, `lib/serverApi.ts`
- [x] **T-AUTH-8** Logout in the header and on the profile page. _(REQ-AUTH-8)_ → `components/layout/AppHeader.tsx`, `components/profile/ProfileForm.tsx`
- [x] **T-AUTH-9** `/profile` page. _(REQ-USER-4)_ → `frontend/src/app/profile/page.tsx`, `components/profile/ProfileForm.tsx`

## Tests

- [x] **T-AUTH-10** Playwright: the four auth scenarios. _(REQ-AUTH-6, REQ-AUTH-7, REQ-AUTH-8)_ → `frontend/e2e/auth.spec.ts`
- [x] **T-AUTH-11** Unit tests for session helpers and token expiry. _(REQ-AUTH-6)_ → `frontend/src/lib/session.test.ts`
