# Comments: Requirements

## Scope

Commenting on cards, owner-only edit and delete, and the card details dialog that hosts the comment thread.

## Requirements

### REQ-CMT-1 · Add a comment

**Story:** As a member, I want to comment on a card so that my team sees my update.

- **AC-CMT-1.1** WHEN a board member calls `POST /api/cards/<id>/comments` with non-blank `content` (at most 2000 characters), THEN the API SHALL create the comment with `user_id` taken from the token and respond `201` with the comment and its author.
- **AC-CMT-1.2** WHEN `content` is missing, blank or too long, or the body contains `user_id` or any unknown field, THEN the API SHALL respond `400`.
- **AC-CMT-1.3** WHEN no token is sent, THEN the API SHALL respond `401`.
- **AC-CMT-1.4** WHEN the caller is not a member of the card's board, THEN the API SHALL respond `403`.

### REQ-CMT-2 · List comments

- **AC-CMT-2.1** WHEN a member calls `GET /api/cards/<id>/comments`, THEN the API SHALL return the card's live comments oldest first.
- **AC-CMT-2.2** WHEN the caller is not a member, THEN `403`; unknown card → `404`; no token → `401`.

### REQ-CMT-3 · Edit a comment (owner only)

- **AC-CMT-3.1** WHEN the author calls `PATCH /api/comments/<id>` with valid `content`, THEN the API SHALL update it, advance `updated_at`, and respond `200`.
- **AC-CMT-3.2** WHEN any other user, including a board admin, calls, THEN the API SHALL respond `403` and change nothing.
- **AC-CMT-3.3** WHEN `content` is blank, THEN `400`; unknown or deleted comment → `404`; no token → `401`.

### REQ-CMT-4 · Delete a comment (owner only)

- **AC-CMT-4.1** WHEN the author calls `DELETE /api/comments/<id>`, THEN the API SHALL soft-delete it and respond `200`; it SHALL disappear from the list.
- **AC-CMT-4.2** WHEN any other user, including a board admin, calls, THEN `403`; a second delete → `404`; no token → `401`.

### REQ-CMT-5 · Card details dialog and comment list

**Story:** As a member, I want to read and write comments without leaving the board.

- **AC-CMT-5.1** `CardDetailModal.tsx` SHALL be a Client Component that composes `CommentList.tsx` inside `BaseModal.tsx`.
- **AC-CMT-5.2** The dialog SHALL contain a comment form that submits to `POST /api/cards/<id>/comments` and appends the new comment without a reload.
- **AC-CMT-5.3** `CommentList` SHALL show loading, error and empty states, and SHALL offer Edit and Delete only on the current user's comments.
- **AC-CMT-5.4** Editing SHALL happen inline, keep the editor open if saving fails, and mark edited comments.
- **AC-CMT-5.5** Comment text SHALL render as plain text; markup SHALL NOT be interpreted.
