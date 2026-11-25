# Columns and Cards: Requirements

## Scope

Columns, cards, FLOAT ordering, drag-and-drop between columns, My Tasks, and card search. Ordering rules are in `docs/contracts/ordering.md`.

## Requirements

### REQ-COL-1 · Add a column

- **AC-COL-1.1** WHEN a member calls `POST /api/boards/<id>/columns` with a non-blank `name` (at most 100 characters), THEN the API SHALL create the column at `max(order) + 1024` (or `1024` when empty) and respond `201`.
- **AC-COL-1.2** WHEN `name` is blank or an unknown field is sent, THEN the API SHALL respond `400`; no token → `401`; non-member → `403`; unknown board → `404`.
- **AC-COL-1.3** A column MAY be flagged `is_done` so cards in it count as completed.

### REQ-COL-2 · Rename a column

- **AC-COL-2.1** WHEN a member calls `PATCH /api/columns/<id>` with `name` and/or `is_done`, THEN the API SHALL update them and respond `200`.
- **AC-COL-2.2** WHEN the body is empty, THEN `400`; WHEN the caller is not a member, THEN `403`.

### REQ-COL-3 · Delete a column

- **AC-COL-3.1** WHEN an admin calls `DELETE /api/columns/<id>`, THEN the API SHALL soft-delete the column and its cards and respond `200`.
- **AC-COL-3.2** WHEN a non-admin member calls, THEN `403`; WHEN the column is already deleted, THEN `404`.

### REQ-COL-4 · Reorder columns (FLOAT strategy)

- **AC-COL-4.1** WHEN a member calls `PATCH /api/boards/<id>/columns/reorder` with `items: [{id, order}]`, THEN the API SHALL set each column's `order` and respond `200` with the full ordered list.
- **AC-COL-4.2** WHEN an `order` is not a positive finite float, an `id` repeats, an `id` is not a live column of this board, or `items` is empty, THEN the API SHALL respond `400` and change nothing.
- **AC-COL-4.3** WHEN two columns end up with a gap below `1e-6`, THEN the API SHALL renumber the board's columns to multiples of 1024 in the same transaction.
- **AC-COL-4.4** The Board page SHALL offer move-left and move-right controls that compute the new order locally and roll back on failure.

### REQ-CARD-1 · Create a card

- **AC-CARD-1.1** WHEN a member calls `POST /api/columns/<id>/cards` with a non-blank `title` (at most 200 characters), THEN the API SHALL create the card at the end of the column, record `created_by`, and respond `201`.
- **AC-CARD-1.2** WHEN `title` is blank, `order` is not positive, or an unknown field is sent, THEN `400`; no token → `401`; non-member → `403`; unknown column → `404`.
- **AC-CARD-1.3** The Board page SHALL create cards through a `BaseModal` form and show them in the column at once.

### REQ-CARD-2 · Update a card and assign it

- **AC-CARD-2.1** WHEN a member calls `PATCH /api/cards/<id>` with `title`, `description` and/or `assignee_id`, THEN the API SHALL update them; `assignee_id: null` SHALL unassign.
- **AC-CARD-2.2** WHEN `assignee_id` is not a member of the card's board, THEN `400` with code `INVALID_ASSIGNEE`.
- **AC-CARD-2.3** WHEN the body is empty or contains an unknown field (such as `order`), THEN `400`; non-member → `403`; unknown card → `404`.
- **AC-CARD-2.4** WHEN a card is assigned to someone other than the actor, THEN that user SHALL receive a `card_assigned` notification.

### REQ-CARD-3 · Delete a card

- **AC-CARD-3.1** WHEN the card's creator or a board admin calls `DELETE /api/cards/<id>`, THEN the API SHALL soft-delete the card and its comments and respond `200`.
- **AC-CARD-3.2** WHEN another member calls, THEN `403`; WHEN the card is already deleted, THEN `404`.

### REQ-CARD-4 · Move a card

- **AC-CARD-4.1** WHEN a member calls `PATCH /api/cards/<id>/position` with a valid `column_id` and `order`, THEN the API SHALL update the card's column and order and respond `200` with `{card, rebalanced}`.
- **AC-CARD-4.2** WHEN the destination column is on a different board, THEN `400` with code `INVALID_MOVE`; unknown column → `404`; non-member → `403`; no token → `401`.
- **AC-CARD-4.3** WHEN the card enters a different column, THEN `column_entered_at` SHALL be set to now.
- **AC-CARD-4.4** After a move, `GET /api/boards/<id>` SHALL return the card in the new column in the new order.

### REQ-CARD-5 · CardPositionSchema validation

- **AC-CARD-5.1** `CardPositionSchema` SHALL require `column_id` to be a valid UUID and `order` to be a float greater than 0, finite, and at most `1e12`.
- **AC-CARD-5.2** WHEN `column_id` is missing or malformed, or `order` is missing, zero, negative, a string, a boolean, `NaN`, or too large, or an extra key is present, THEN the API SHALL respond `400`.

### REQ-CARD-6 · Rebalancing

- **AC-CARD-6.1** WHEN a move leaves two cards in the destination column with equal orders or a gap below `1e-6`, THEN the API SHALL renumber that column to `1024, 2048, ...` in the same transaction and return `rebalanced: true`.
- **AC-CARD-6.2** WHEN the response has `rebalanced: true`, THEN the client SHALL refetch the board.

### REQ-CARD-7 · My Tasks

**Story:** As a user, I want one list of everything assigned to me.

- **AC-CARD-7.1** WHEN `GET /api/cards?assignee=me` is called, THEN the API SHALL return only live cards assigned to the caller on boards where they are a member, each with its `board` and `column` names.
- **AC-CARD-7.2** WHEN `assignee` has any value other than `me`, THEN `400`; no token → `401`.
- **AC-CARD-7.3** `/my-tasks` SHALL be a Server Component that fetches that endpoint and groups the cards by board name, with an empty state and an "Open board" `BaseButton` per group.

### REQ-CARD-8 · Card search

- **AC-CARD-8.1** WHEN `GET /api/cards?q=<text>&board_id=<id>` is called, THEN the API SHALL return live cards whose title or description contains the text (case-insensitive, `%` and `_` treated literally), at most `limit` (default 50, maximum 100).
- **AC-CARD-8.2** WHEN the caller is not a member of `board_id`, THEN `403`.
- **AC-CARD-8.3** The Board page search box SHALL send a request only after 300 ms without typing and SHALL list matching cards; choosing one SHALL open its details.

### REQ-CARD-9 · Drag and drop

- **AC-CARD-9.1** `hooks/useDragAndDrop.ts` SHALL use the native HTML5 Drag and Drop API to drag a card between and within columns.
- **AC-CARD-9.2** WHEN a card is dropped, THEN the hook SHALL update local state immediately (optimistic update) and call `PATCH /api/cards/<id>/position` with an order computed from its new neighbours.
- **AC-CARD-9.3** WHEN the API returns an error, THEN the hook SHALL restore the card to its original column and position and report the error.
- **AC-CARD-9.4** WHEN a card is dropped where it already is, THEN no request SHALL be sent.
- **AC-CARD-9.5** The card details dialog SHALL offer "Move to column" as a keyboard and touch alternative using the same optimistic move.
