# RevoTask Design System

RevoTask adopts the visual language of the CaliStore hardware design system (`calistore-hardware-design-system.html` in this folder, reference only): concrete and paper surfaces, thick ink borders, hard offset shadows, and one orange signal color. Tokens live in `frontend/tailwind.config.ts`; components must not use hex literals (guideline FE-13).

## Tokens

| Token                                          | Value                                                     | Use                                             |
| ---------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| `ink`                                          | `#111111`                                                 | text, borders, shadows                          |
| `paper`                                        | `#FAF8F3`                                                 | plates, cards, dialogs                          |
| `well`                                         | `#E4E1D9`                                                 | inputs                                          |
| `concrete-100` / `200` / `300` / `500` / `700` | `#ECEAE4` / `#DAD7CF` / `#C2BFB6` / `#8A8780` / `#4A4944` | page, columns, disabled, secondary text         |
| `signal-300` / `500` / `600`                   | `#FF9A6E` / `#FF5A1F` / `#E04407`                         | the one action color                            |
| `tag`                                          | `#FFD83D`                                                 | badges and highlights                           |
| `success` / `danger`                           | `#1F8A4C` / `#C21F3A`                                     | status; danger never reads as the orange action |

Fonts: Archivo (display) and JetBrains Mono (numbers, labels, inputs), loaded with `next/font`.

## Shape and depth

- Plates and cards: no radius, `border-3 border-ink`, `shadow-hard` (4px) or `shadow-hard-lg` (8px).
- Keys (buttons) and inputs: 8px radius, 3px border, 44px minimum height. Keys use `shadow-key`; inputs use the inset `shadow-well`.
- Pressed keys move 3px and drop the shadow (`shadow-pressed`). Motion is 120ms and respects `prefers-reduced-motion`.

## Components (`frontend/src/components/shared/`)

`BaseButton` (primary, secondary, destructive, ghost; sizes md, sm, icon; renders a link with `href`), `BaseBadge` (gray, orange, green, red, yellow), `BaseModal` (wraps every in-app form), `BaseInput`, `BaseSelect`, `BaseTextarea`, `NameFormModal`, `ConfirmModal`.

## Rules

1. Ink text on orange keys, never white (white on orange is about 3:1).
2. At most one primary (orange) action per view. Destructive uses `danger`.
3. Focus is a 3px orange outline with a 3px gap and is never removed.
4. Every input has a visible label. Touch targets are at least 44px.
5. The page never scrolls sideways; the Kanban board scrolls inside its own container.
6. Mono is for numbers, labels and inputs, not running copy.

## Responsive behaviour

Mobile first from 360px. Columns are 18rem wide on phones (20rem from 640px) and snap-scroll horizontally; dialogs become bottom sheets under 640px. `e2e/responsive.spec.ts` asserts no horizontal overflow at 375px.
