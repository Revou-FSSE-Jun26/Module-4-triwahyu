# Authentication and Users: Design

## Routes and pages

| REQ           | Interface                     | Handler                                                       | Service                                     | Schema                                       | Authorization                    |
| ------------- | ----------------------------- | ------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------- | -------------------------------- |
| REQ-AUTH-1, REQ-AUTH-2 | `POST /api/auth/register`     | `auth/routes.py::register`                                    | `auth/service.py::register_user`            | `RegisterSchema`                             | public                           |
| REQ-AUTH-3, REQ-AUTH-4 | `POST /api/auth/login`        | `auth/routes.py::login`                                       | `auth/service.py::login`                    | `LoginSchema`, `LoginResponseSchema`         | public                           |
| REQ-USER-1    | `GET /api/users/me`           | `users/routes.py::get_me`                                     | `users/service.py::get_user`                | `UserSchema`                                 | `@jwt_required`                  |
| REQ-USER-2, REQ-USER-3 | `PATCH /api/users/me`         | `users/routes.py::update_me`                                  | `users/service.py::update_profile`          | `UserUpdateSchema` (unknown fields rejected) | `@jwt_required`, own record only |
| REQ-AUTH-5    | page `/register`              | `app/register/page.tsx` → `components/auth/RegisterForm.tsx`  | `lib/validation.ts`                         | n/a                                          | public                           |
| REQ-AUTH-6    | page `/login`                 | `app/login/page.tsx` → `components/auth/LoginForm.tsx`        | `context/AuthContext.tsx`, `lib/session.ts` | n/a                                          | public                           |
| REQ-AUTH-7    | middleware, server fetch      | `src/middleware.ts`, `lib/serverApi.ts::withSession`          | n/a                                         | n/a                                          | cookie token                     |
| REQ-AUTH-8    | header button, profile button | `components/layout/AppHeader.tsx`, `AuthContext.logout`       | n/a                                         | n/a                                          | n/a                              |
| REQ-USER-4    | page `/profile`               | `app/profile/page.tsx` → `components/profile/ProfileForm.tsx` | `lib/api.ts::users.updateMe`                | n/a                                          | signed in                        |

## Data

`users(id, name, email unique lower-case, password_hash, created_at, updated_at)`. Registration also inserts one `welcome` notification in the same transaction (see 05-notifications).

## Behaviour notes

- **Hashing.** `werkzeug.security.generate_password_hash(method="scrypt")`; tests use `pbkdf2:sha256:1000` via the `PASSWORD_HASH_METHOD` config for speed only.
- **Constant-ish login time.** When the email is unknown, `check_password_hash` runs against a module-level dummy hash.
- **Token.** `create_access_token(identity=str(user.id))`; lifetime from `JWT_ACCESS_TOKEN_EXPIRES`. All JWT failures use the envelope with `401` (library default `422` is overridden).
- **Session on the web.** `AuthProvider` receives the cookie token from the root layout, validates it with `GET /users/me`, schedules a sign-out at `exp`, and exposes `api`, `login`, `logout`, `setUser`. See ADR 0003 for why the cookie is readable by JavaScript.
- **Open redirect.** `safeNext()` accepts only values starting with a single `/`.
- **Email enumeration trade-off.** Registration returns `409` for an existing email because the UX benefit outweighs the leak for this product; login stays generic.
