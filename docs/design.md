# Design

Status: proposal, reflected in `docs/design-artifact.md` and the Figma file `space_x_proj`, page `Plate`. Not approved. No UI has been built.

The look is the overlap of the public SpaceX, Tesla, and Grok/xAI sites, sampled 2026. It is not their logo and not a claim of an official brand kit. No logos, no wordmarks, no product names other than Plate and Grok.

Shared by all three: black and white, almost no color, geometric sans, hairline controls, no shadows, no cards-for-the-sake-of-cards.

Taken from each:

- SpaceX (spacex.com): void `#000000`, text `#F0F0FA`, light grey `#CCCCCC`, D-DIN, uppercase labels, ghost buttons with a 1px border at about 35% white and a 4px radius.
- Tesla (tesla.com): carbon surfaces `#171A20`, graphite `#393C41`, light product on a dark field, red `#E82127` only where something is actually wrong.
- Grok / xAI (x.ai): near-black surfaces, and lime `#75FBA6` only as the live mark next to Grok. Not a theme color.

D-DIN and Universal Sans are proprietary. The UI uses Barlow (OFL), the closest free stand-in for D-DIN. G-code uses Roboto Mono (Apache 2.0). Icons are Material Symbols Outlined (Apache 2.0). All three ship as font files in `web/src/assets/fonts/`. No runtime Google Fonts fetch, so the app runs offline and the CSP stays `font-src 'self'`.

## Tokens

This table is the only palette. `AGENTS.md` summarizes it; if they disagree, this file wins. Figma `Foundations` shows the same 14 swatches.

| Token | Value | Use | Contrast checked |
| --- | --- | --- | --- |
| `void` | `#000000` | Page background, gaps between panels | n/a |
| `mat` | `#1C1F24` | Flat stage behind the plate | n/a |
| `surface` | `#171A20` | Header, rail, inspector, status bar | n/a |
| `field` | `#000000` | Inputs, prompt rows, composer | n/a |
| `rule` | `#393C41` | 1px dividers between panels and sections. Decorative only. | n/a |
| `field-border` | `#6B7280` | 1px edge of inputs and prompt rows | 3.6:1 on surface, 4.3:1 on field |
| `ghost-border` | `rgba(240, 240, 250, 0.35)` | Ghost buttons (the label identifies the control) | n/a |
| `text` | `#F0F0FA` | Labels and values | 15.4:1 on surface |
| `muted` | `#CCCCCC` | Secondary sentences | 10.9:1 on surface |
| `dim` | `#8E939C` | Field labels, key hints, line numbers, placeholders | 5.7:1 on surface |
| `plate` | `#E6E8ED` | Stock, flat | n/a |
| `ink` | `#171A20` | Feature edges, dimensions, selection on the plate | 14.2:1 on plate |
| `error` | `#E82127` | Strokes and fills only: refused geometry, an invalid field's edge | 3.7:1 on mat (graphic, ≥ 3:1) |
| `error-text` | `#FF5A5F` | Error sentences and red status text | 5.7:1 on surface, 5.4:1 on mat |
| `live` | `#75FBA6` | The Grok dot, only while a chat turn is running | n/a |

Why `error-text` exists: `#E82127` text on `surface` is 3.9:1 and fails WCAG AA for 12–14px type. Red stays the Tesla red wherever it is a shape. The text uses the lighter red.

Rules for these tokens:

- Text is at least 4.5:1 on its background. A control's edge is at least 3:1 when it is the only thing that marks the control.
- Lime never fills anything larger than the 8px dot. It never means "success".
- Red never means "selected" or "active".
- Components use CSS custom properties named after the tokens (`--plate-mat`, …). A hex value in a component stylesheet is a review failure.

Type: Barlow 400 and 500. Labels 10–12px, uppercase, tracking `0.08em`. Body 13–16px, sentence case. Numbers use tabular figures (`font-variant-numeric: tabular-nums`). G-code is Roboto Mono 13px. Radius 4px everywhere a control has a radius. No drop shadows.

Focus: keyboard focus is a 2px `text` outline with a 2px offset on chrome (`:focus-visible` only). On the plate, focus and selection are the dashed `ink` box, because a white ring disappears on aluminum.

Motion: the live dot pulses at 1.2 s. Under `prefers-reduced-motion: reduce` it is steady. Nothing else animates except the zoom transform.

## Screens

One window. Two modes: Draw and Program. The chrome does not move between them.

Figma boards, 1440 × 900 unless noted:

| Board | PNG | Shows |
| --- | --- | --- |
| Foundations | `design/figma/out/foundations.png` | Tokens, controls, focus, save states, contrast rule |
| Draw: empty | `draw-empty.png` | First load, starter prompts |
| Draw: four holes | `draw-holes.png` | Selected hole, Grok turn with its trace, composer |
| Draw: pocket and slot | `draw-features.png` | Pocket and slot geometry, pocket inspector, tool note |
| Draw: Grok working | `grok-working.png` | Live dot, running trace, read-only drawing, Stop |
| Draw: Grok off | `grok-off.png` | 503 state: drawing works, composer disabled |
| Program | `program.png` | Operations, setup, mini plate, numbered file, banner |
| Draw: rejected | `rejected.png` | Refused hole off the stock, server sentence in red |

Header: product mark, part-name chip (opens the part menu: list, new, delete), Draw / Program switch with pencil and code icons, a `MM` unit badge (static, not a toggle), and the save mark (`SAVING…`, `SAVED`, `NOT SAVED`).

Rail: Select V, Hole H, Pocket P, Slot S. Each has an icon, a name, and its key. The active tool is the whole key turned light, with the icon and name in ink. While Grok works the rail is dimmed and inert.

Stage: a flat mat. Grid 10 mm, major line every 50 mm. Millimeter ruler on the left, inch ruler under the part (mat reference only; the part stays mm), a 0° / 45° / 90° angle mark. The plate is a flat sheet with extension dimensions. The origin is a quartered datum circle at the lower-left corner, labeled `0, 0`. Zoom control lower right: −, FIT, +.

Features on the plate:

- Hole: dark bore with a center cross. Threaded holes are drawn at the tap-drill diameter.
- Pocket: rounded rectangle at the real corner radius, slightly darker fill, `ink` edge.
- Slot: capsule, slightly darker fill, centerline in `dim`.
- Selection: dashed `ink` box with a leader to a one-line callout (`M6 · Ø 5.0`, `40 × 18 · R3 · 4 deep`).
- Drag preview: dashed outline, no fill. It is local until the API accepts it.
- Refused: dashed `error` outline with an 18% `error` fill, labeled `outside` in `error-text`.

Right column, top to bottom: Stock (name, material with a plate swatch, length, width, thickness), the selected feature (one summary line with the tool the program will use, then the fields, then Remove), then Grok.

Grok section:

- Starter prompts are two-line rows (kicker, sentence). Click sends.
- A user message is a `field` block. Each tool call is a log row: `OK` / `NO` / `…`, the tool name in mono, a short detail (`4 holes · rev 2`). Rows are not buttons.
- The reply is two or three sentences in `muted`.
- While running: live dot, `GROK IS WORKING`, a ghost `STOP`, and `ROUND n OF 8` in the status bar.
- The composer ends in a light send button. Disabled composer: `rule` edge, `rule` send button.

Program: the stage is replaced by a plain mat (no grid, no rulers). A banner, `TRAINING OUTPUT`, says "Do not send this file to a machine." Left column: operations numbered 10, 20, …; the setup (offset, retract, tools, stock); a small plate. Center: the numbered file with a Copy button and a footer (`N LINES · MM · ABSOLUTE · G54`). Operations that are not in the file (taps) are listed in `dim` and say so. If `runnable` is false the banner gains a second line in `error-text` naming each issue.

Status bar: cursor position in shop mm on the left (`error-text` when the point is outside the stock); snap and feature count on the right.

## States every screen must handle

| State | What the user sees |
| --- | --- |
| Loading a part | Stage shows the mat only; inspector says "Loading PLATE-001…" |
| Load failed | Inspector says "Could not reach the API. Retry." with a ghost Retry. Drawing is not shown. |
| No parts yet | The API creates PLATE-001 on first load. There is no empty list screen. |
| Saving | Header `SAVING…` in `muted` |
| Saved | Header `SAVED` in `dim` |
| Save refused (422) | Header stays `SAVED` (the stored part did not change). Sentence in red under the field or the feature. |
| Network failure on save | Header `NOT SAVED` in `error-text`; preview discarded |
| Changed elsewhere (409 `version_conflict`) | Part reloads; status line says "The part changed in another tab. Reloaded." |
| Grok working | Live dot, read-only drawing and inspector, Stop |
| Grok not configured (503) | "Grok is not configured. The drawing still works." Composer disabled. |
| Grok failed (502 / 504) | The steps that passed stay (each is its own undo). Reply line in `error-text`: "Grok did not answer. Steps that passed are kept." |
| Rate limited (429) | "Grok limit reached for today." Composer disabled until the next day. |

## Copy

- Errors are the C# sentence, verbatim, with its numbers: "Hole at (130, 40) is outside the 120 × 80 mm stock." Then "The plate did not change." in `dim`.
- Sentence case for sentences, uppercase only for labels.
- Never "safe", "ready to run", or "verified" about the program.

Starter sentences, sent on click:

- Four M6 holes, 12 mm from each corner.
- Six M5 holes on a 50 mm bolt circle at the center.
- A 40 by 18 pocket, 4 mm deep, centered.

## Keyboard

| Key | Action |
| --- | --- |
| V / H / P / S | Select / Hole / Pocket / Slot tool |
| Esc | Cancel the drag, or clear the selection |
| Delete, Backspace | Remove the selected feature |
| Arrow keys | Move the selected feature 1 mm; with Shift, 10 mm |
| ⌘Z / Ctrl+Z | Undo (server-side, see backend) |
| ⌘⇧Z / Ctrl+Shift+Z | Redo |
| Tab | Cycles chrome, then features in creation order |
| F | Fit the stock |
| 1 / 2 | Draw / Program |

Single-letter keys are ignored while focus is in a text field.

## Behavior

- Snap is 1 mm. Shift disables it for that gesture.
- A rejected edit does not move the drawing.
- The drawing updates only after C# accepts the change.
- Threaded holes show the drill diameter and say the tap is not in the program.
- Empty state is a blank 120 × 80 × 12 mm plate, 6061-T6, named PLATE-001.
- Minimum supported window is 1280 × 720. Below that, the stage shows "Plate needs a window at least 1280 × 720." Touch is not supported in v1.

## Shop frame

Millimeters. Origin at the lower-left of the stock, on the top face. +X along the length, +Y along the width, on screen +X right and +Y up. Depth is positive into the material; Z in the program is negative. Through means the hole breaks out of the bottom face (see `docs/backend.md`, G-code).

## V1 scope

In: saved plates, stock, holes, pockets, slots, draw, program, inspector, Grok tools, server-side undo, SQLite.

Out until that works: assemblies, STEP, GD&T, 3D, accounts, inches as a unit, a machine connection, touch, light theme.
