# Authentication and Users: Requirements

## Scope

Registration, login, JWT lifecycle, route protection, the current user's profile, and profile updates.

## Requirements

### REQ-AUTH-1 · Register

**Story:** As a visitor, I want to create an account so that I can use RevoTask.

- **AC-AUTH-1.1** WHEN `POST /api/auth/register` receives a valid `name`, `email` and `password`, THEN the API SHALL create the user, respond `201` with `{"data": {"user": {...}}}`, and the user object SHALL NOT contain the password or its hash.
- **AC-AUTH-1.2** The password SHALL be stored only as a scrypt hash.
- **AC-AUTH-1.3** The email SHALL be stored lower-case.

### REQ-AUTH-2 · Registration validation

**Story:** As a visitor, I want clear errors when my input is wrong.

- **AC-AUTH-2.1** WHEN the email already exists (any letter case), THEN the API SHALL respond `409` with code `CONFLICT`.
- **AC-AUTH-2.2** WHEN `name` is blank, `email` is invalid, the password is shorter than 8 characters or lacks a letter and a number, or an unknown field is sent, THEN the API SHALL respond `400` with field-level `details`.
- **AC-AUTH-2.3** WHEN the body is not a JSON object, THEN the API SHALL respond `400`.

### REQ-AUTH-3 · Login

**Story:** As a user, I want to sign in and receive a token so that I can call protected endpoints.

- **AC-AUTH-3.1** WHEN `POST /api/auth/login` receives valid credentials, THEN the API SHALL respond `200` with `access_token`, `token_type: "Bearer"`, `expires_in` and the user.
- **AC-AUTH-3.2** The token SHALL carry `sub` (the user id), `iat` and an `exp` equal to `iat + expires_in`; the lifetime SHALL come from `JWT_ACCESS_TOKEN_MINUTES` (default 60).

### REQ-AUTH-4 · Safe login failures

**Story:** As an account owner, I do not want attackers to learn which emails are registered.

- **AC-AUTH-4.1** WHEN the email is unknown or the password is wrong, THEN the API SHALL respond `401` with the identical message `Invalid email or password`.
- **AC-AUTH-4.2** WHEN the email is unknown, THEN the API SHALL still perform a password-hash verification so response time does not reveal the account.
- **AC-AUTH-4.3** WHEN `email` or `password` is missing, THEN the API SHALL respond `400`.

### REQ-AUTH-5 · Register page

**Story:** As a visitor, I want a register form that checks my input before I submit.

- **AC-AUTH-5.1** `/register` SHALL show controlled inputs for name, email, password and confirmation.
- **AC-AUTH-5.2** WHEN a field loses focus or the form is submitted, THEN client validation SHALL show an error beside the field, and invalid input SHALL NOT call the API.
- **AC-AUTH-5.3** WHEN input is valid, THEN the page SHALL `POST /api/auth/register` and redirect to `/login?registered=1`.
- **AC-AUTH-5.4** WHEN the API returns `409`, THEN the page SHALL show the message under the email field.

### REQ-AUTH-6 · Login page and session

**Story:** As a user, I want to sign in and stay signed in across reloads.

- **AC-AUTH-6.1** WHEN valid credentials are submitted at `/login`, THEN the token SHALL be stored in `AuthContext` (mirrored in a `SameSite=Lax` cookie) and the user SHALL be redirected to the dashboard, or to a same-site `next` path.
- **AC-AUTH-6.2** WHEN the API returns `401`, THEN the page SHALL show "Invalid email or password." and stay on `/login`.
- **AC-AUTH-6.3** The `next` parameter SHALL be accepted only when it is a same-site path (no open redirect).
- **AC-AUTH-6.4** WHEN the token expires, THEN the app SHALL clear the session and send the user to `/login`.

### REQ-AUTH-7 · Route protection

**Story:** As an owner of private data, I want protected pages to require sign-in.

- **AC-AUTH-7.1** WHEN a visitor without a valid token opens `/`, `/boards/*`, `/my-tasks` or `/profile`, THEN `middleware.ts` SHALL redirect to `/login` (with `next` set for non-root paths).
- **AC-AUTH-7.2** WHEN a Server Component receives `401` from the API, THEN it SHALL redirect to `/login?expired=1`.
- **AC-AUTH-7.3** Every protected API route SHALL independently require a valid JWT.

### REQ-AUTH-8 · Logout

**Story:** As a user on a shared computer, I want to sign out completely.

- **AC-AUTH-8.1** WHEN the user clicks "Log out", THEN `AuthContext` and the session cookie SHALL be cleared and the user SHALL land on `/login`.
- **AC-AUTH-8.2** WHEN a signed-out user opens a protected page, THEN they SHALL be redirected to `/login`.

### REQ-USER-1 · Read my profile

- **AC-USER-1.1** WHEN `GET /api/users/me` is called with a valid token, THEN the API SHALL respond `200` with `id`, `name`, `email`, `created_at` and no password data.
- **AC-USER-1.2** WHEN the token is missing, malformed or expired, THEN the API SHALL respond `401`.

### REQ-USER-2 · Update my profile

- **AC-USER-2.1** WHEN `PATCH /api/users/me` receives `name` and/or `email`, THEN the API SHALL update them (email lower-cased) and respond `200` with the profile.
- **AC-USER-2.2** WHEN the new email belongs to another user, THEN the API SHALL respond `409`; WHEN it is the user's own email, THEN it SHALL succeed.
- **AC-USER-2.3** WHEN the body is empty or the email is invalid, THEN the API SHALL respond `400`.

### REQ-USER-3 · Password changes are not allowed here

- **AC-USER-3.1** WHEN `PATCH /api/users/me` includes `password` (or any unknown field), THEN the API SHALL respond `400` and change nothing.

### REQ-USER-4 · Profile page

**Story:** As a user, I want to update my name and email.

- **AC-USER-4.1** `/profile` SHALL show a controlled form pre-populated from `AuthContext`.
- **AC-USER-4.2** WHEN the form is valid and submitted, THEN the page SHALL `PATCH /api/users/me`, update `AuthContext`, and show a success toast.
- **AC-USER-4.3** WHEN the API returns `409`, THEN the page SHALL show the message under the email field.
- **AC-USER-4.4** The page SHALL use `BaseButton` for its actions, including "Log out".
