# Boards and Members: Requirements

## Scope

Creating, listing, reading, renaming and deleting boards; board membership and roles; the Dashboard and Board Detail pages. Permissions follow `docs/contracts/permission-matrix.md`.

## Requirements

### REQ-BOARD-1 · Create a board

**Story:** As a user, I want to create a board so that I can organize a project.

- **AC-BOARD-1.1** WHEN `POST /api/boards` receives a non-blank `name` (at most 100 characters), THEN the API SHALL create the board, make the caller its `admin`, and respond `201` with the board summary.
- **AC-BOARD-1.2** WHEN `name` is blank, too long, or an unknown field is sent, THEN the API SHALL respond `400`.
- **AC-BOARD-1.3** WHEN the token is missing, THEN the API SHALL respond `401`.

### REQ-BOARD-2 · List my boards

- **AC-BOARD-2.1** WHEN `GET /api/boards` is called, THEN the API SHALL return only boards the caller belongs to, newest first, each with `role` and `member_count`.
- **AC-BOARD-2.2** Soft-deleted boards SHALL NOT appear.
- **AC-BOARD-2.3** WHEN the token is missing, THEN the API SHALL respond `401`.

### REQ-BOARD-3 · Read a board with columns and cards

- **AC-BOARD-3.1** WHEN a member calls `GET /api/boards/<id>`, THEN the API SHALL return the board, its members, and its columns ordered by `order`, each with its cards ordered by `order`.
- **AC-BOARD-3.2** WHEN the caller is not a member, THEN the API SHALL respond `403`; WHEN the board does not exist, is soft-deleted, or the id is not a UUID, THEN `404`.
- **AC-BOARD-3.3** The number of SQL queries SHALL NOT depend on the number of cards.

### REQ-BOARD-4 · Rename a board

- **AC-BOARD-4.1** WHEN an admin calls `PATCH /api/boards/<id>` with a valid `name`, THEN the API SHALL rename it and respond `200`.
- **AC-BOARD-4.2** WHEN the caller is a non-admin member, THEN the API SHALL respond `403`; WHEN `name` is blank, THEN `400`.

### REQ-BOARD-5 · Delete a board

- **AC-BOARD-5.1** WHEN an admin calls `DELETE /api/boards/<id>`, THEN the API SHALL soft-delete the board, its columns, their cards and those cards' comments in one transaction and respond `200` with the id.
- **AC-BOARD-5.2** WHEN the caller is a non-admin member, THEN the API SHALL respond `403`.
- **AC-BOARD-5.3** After deletion the board SHALL return `404` and its cards SHALL NOT appear in any list.

### REQ-BOARD-6 · Manage members

**Story:** As a board administrator, I want to control who can access my board.

- **AC-BOARD-6.1** WHEN an admin calls `POST /api/boards/<id>/members` with an existing user's `email` and a `role`, THEN the API SHALL add the member, notify them, and respond `201`.
- **AC-BOARD-6.2** WHEN the email is unknown, THEN the API SHALL respond `404`; WHEN the user is already a member, THEN `409`; WHEN a non-admin calls, THEN `403`.
- **AC-BOARD-6.3** WHEN an admin calls `PATCH /api/boards/<id>/members/<user_id>` with a valid role, THEN the API SHALL change it; an invalid role SHALL be `400`.
- **AC-BOARD-6.4** WHEN an admin calls `DELETE /api/boards/<id>/members/<user_id>`, THEN the member SHALL be removed and that user's cards on the board SHALL become unassigned.
- **AC-BOARD-6.5** WHEN a request would remove or demote the last admin, THEN the API SHALL respond `409`.
- **AC-BOARD-6.6** Any member SHALL be able to list members with `GET /api/boards/<id>/members`.

### REQ-BOARD-7 · Dashboard page

**Story:** As a user, I want to see my boards when I open the app.

- **AC-BOARD-7.1** `/` SHALL be a Server Component that fetches `GET /api/boards` and lists every board as a link with its name, role badge and member count.
- **AC-BOARD-7.2** WHEN the user has no boards, THEN the page SHALL show an empty state.
- **AC-BOARD-7.3** "New board" SHALL open a `BaseModal` form; on success the user SHALL be taken to the new board.

### REQ-BOARD-8 · Board detail page

**Story:** As a member, I want to see the board as a Kanban layout.

- **AC-BOARD-8.1** `/boards/[id]` SHALL be a Server Component that fetches the board and renders its columns and cards in a Kanban layout.
- **AC-BOARD-8.2** WHEN the API returns `404`, THEN the page SHALL show the not-found page; WHEN `403`, THEN a "no access" message with a link back.
- **AC-BOARD-8.3** Admins SHALL see Rename, Delete board and Analytics actions; members SHALL NOT.
- **AC-BOARD-8.4** The Members dialog SHALL list members with roles; admins SHALL be able to add, change role and remove.
