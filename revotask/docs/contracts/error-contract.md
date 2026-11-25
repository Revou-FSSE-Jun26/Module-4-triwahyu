# API Envelope and Error Contract

Owner rule: `guidelines/backend.md` BE-05 and BE-06.

## Success

```json
{ "data": { "...": "..." } }
```

Collections that are paginated return an object inside `data`:

```json
{ "data": { "items": [], "page": 1, "per_page": 20, "total": 0, "pages": 0 } }
```

Deletes return `200` with `{ "data": { "id": "<uuid>" } }`. There are no `204` responses, so the envelope never breaks.

## Failure

`error` is always a **string**. `code` and `details` are optional siblings.

```json
{
  "error": "Validation failed: email: Not a valid email address.",
  "code": "VALIDATION_ERROR",
  "details": { "email": ["Not a valid email address."] }
}
```

| Status | `code`                                                                   | When                                                                      |
| -----: | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
|    400 | `VALIDATION_ERROR` / `BAD_REQUEST` / `INVALID_ASSIGNEE` / `INVALID_MOVE` | Body, query or business input is invalid                                  |
|    401 | `UNAUTHORIZED`                                                           | Token missing, malformed, or expired; wrong credentials                   |
|    403 | `FORBIDDEN`                                                              | Authenticated but not allowed (not a member, not the owner, not an admin) |
|    404 | `NOT_FOUND`                                                              | Resource does not exist or is soft-deleted; unknown route                 |
|    405 | `METHOD_NOT_ALLOWED`                                                     | Wrong verb for a route                                                    |
|    409 | `CONFLICT`                                                               | Duplicate email, duplicate membership, removing the last admin            |
|    500 | `INTERNAL_ERROR`                                                         | Unexpected failure. Message is always `Internal server error`             |

## Rules

- Never expose stack traces, SQL text, secrets, or exception class names.
- A login failure is always `401 "Invalid email or password"`, whether the email exists or not.
- Frontend `ApiError` carries `statusCode`, `message` (from `error`), `code`, and `details`.
- Changing this contract requires updating `guidelines/backend.md`, the frontend `ApiError`, and the tests in `backend/tests/test_errors.py`.
