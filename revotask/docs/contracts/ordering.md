# Ordering Contract (FLOAT strategy)

Owner rule: `guidelines/database.md` DB-04. Applies to `columns.order` and `cards.order`, both `db.Float`, both greater than 0.

## Computing a position (client and server share the rule)

| Drop position         | New `order`                     |
| --------------------- | ------------------------------- |
| Empty column          | `1024.0`                        |
| After the last item   | `last.order + 1024.0`           |
| Before the first item | `first.order / 2`               |
| Between two items     | `(prev.order + next.order) / 2` |

## Reading

Always `ORDER BY order, created_at, id`. Ties are legal and deterministic.

## Endpoints

- `PATCH /api/cards/<id>/position` with `{ "column_id": "<uuid>", "order": <float> }` (`CardPositionSchema`: valid UUID, `order > 0`, finite, at most `1e12`). The destination column must be on the same board as the card, otherwise `400 INVALID_MOVE`.
- `PATCH /api/boards/<id>/columns/reorder` with `{ "items": [ { "id": "<uuid>", "order": <float> } ] }`. Every `id` must be a distinct, live column of that board. The response is the full ordered column list.

## Rebalancing

After a write the server checks the affected sibling set. If any adjacent gap is below `1e-6` (or two orders are equal), it renumbers the set to `1024, 2048, ...` in the same transaction. The card move response then has `"rebalanced": true`, and the client refetches the board.

## Concurrency

Each move writes only the moved row, so two users moving different cards never conflict. Two moves of the same card are last-write-wins. No locking is used.
