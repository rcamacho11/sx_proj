# Frontend

Status: proposal. Angular and TypeScript. The visual rules are in [design.md](design.md). Follow them. Do not restyle from a component.

## Role of the frontend

The Angular app draws the part and sends actions. It does not decide whether a hole fits. It does not generate G-code. It does not call `api.x.ai`.

If a rule exists in TypeScript and in C#, delete the TypeScript copy and call the API. Snapping a cursor to 1 mm is a view concern and can live in the client. Whether the snapped point is a legal hole is not.

## Versions

Pin the current Angular major on scaffold day, with `package-lock.json` committed and `npm ci` everywhere. Node is the active LTS, pinned in `.nvmrc` and in the `web` Dockerfile. Standalone components, signals for state, the CLI's default test runner. No NgModules, no NgRx.

## App shape

```
web/
  src/app/
    app.ts                  shell: header, rail, center, right column
    part.store.ts           signals: part, version, selection, saveState, grokState, error
    part.api.ts             the only HttpClient user for /api
    draw/                   the sheet (SVG), tools, hit testing, keyboard
    inspector/              stock and feature forms
    program/                operations and G-code text
    chat/                   transcript, trace rows, composer
    domain/                 TypeScript interfaces generated from the API's OpenAPI document
  src/styles/tokens.css     the design.md tokens as CSS custom properties
  src/assets/fonts/         Barlow, Roboto Mono, Material Symbols (subset)
  e2e/                      Playwright
```

DTO types are generated from `GET /openapi/v1.json` (ASP.NET Core built-in OpenAPI) with a pinned generator, committed, and checked for drift in CI. Do not hand-write a second copy of the contract.

## State

One part in memory, loaded by id. `PartStore` holds the part and its `version`. Every mutating call sends that `version`.

| Response | Store does |
| --- | --- |
| 200 | Replace the whole part and `version`. Do not merge feature arrays by hand. |
| 422 | Keep the part. Set `error` with `{ message, code, field }`. Discard any preview. |
| 409 `version_conflict` | Reload the part, then show "The part changed in another tab. Reloaded." |
| 409 `grok_busy` | Should not happen (the UI is read-only during a turn). Reload and show the sentence. |
| Network failure | Keep the part, `saveState = notSaved`, discard the preview. |

Undo / redo: ⌘Z and ⌘⇧Z post to `/undo` and `/redo` with the current `version`. The client keeps no undo stack. History lives in `part_revisions`, so undo survives a reload and covers Grok's edits.

Grok state: `idle → working → idle`. While `working`, the rail, the drawing, and the inspector are read-only, and the live dot shows. Stop aborts the HTTP request (unsubscribe, which cancels the `fetch`); the server records the turn as `cancelled` and keeps the steps that passed. After any chat response, the store replaces the part from the body, even on 502 and 504.

State diagram: [diagrams/uml-state-editor.drawio](diagrams/uml-state-editor.drawio).

Routing: `/parts/:id`. `/` redirects to the most recent part, creating PLATE-001 if there is none. The part menu in the header lists, creates, and deletes parts. No marketing page.

## Drawing

SVG. It keeps dimensions as elements, stays sharp, and gives each feature a DOM node for focus and hit testing.

- Shop +X to the right, shop +Y up. One `viewBox` transform flips Y; no per-element math.
- Fit the stock in the sheet with padding on first load and when the stock size changes.
- Wheel zooms about the cursor. Middle-drag or Space-drag pans.
- Select hits the topmost feature. Hole: distance to center. Pocket: the rounded rectangle. Slot: distance to the centerline capsule.
- Place and drag call `move_feature` or `add_*` on pointer-up, not on every pointer-move. During the drag, draw a dashed preview. The preview is local and is discarded if the API refuses it.
- Default hole tool drops an M6 through hole.
- Pocket and slot come from a drag. A drag smaller than 4 mm does nothing.
- Each feature `<g>` has `role="button"`, `tabindex="0"`, and an `aria-label` such as "Hole M6 at 12, 12". Arrow keys nudge the focused feature.

Show the cursor position in shop millimeters in the status bar.

Toolpath overlay, when we draw one, uses `moves` from `GET /program`. Do not reconstruct the path in TypeScript.

## Talking to the API

`part.api.ts` is the only file that imports `HttpClient`.

- Base URL is `/api`, so nginx and the dev proxy are the same code.
- Every request sends `Content-Type: application/json` and an `X-Request-Id` (UUID). Error banners show the `requestId` from the response in small `dim` text for bug reports.
- Chat posts to `/api/parts/{id}/chat` and renders `reply`, `trace`, and the returned `part`.
- Program view loads `/api/parts/{id}/program` on entering Program, and again whenever `version` changes.
- Loading and failure states are text in the panel, never a blank screen (table in design.md).
- 503 disables the composer and prompts and shows the "not configured" sentence. It does not affect drawing.

## Forms

Inspector inputs are plain fields. Commit on blur or Enter, not on every keystroke. Sending `set_stock` on each digit would persist illegal intermediate values and fight the validator. Esc reverts the field to the stored value.

Show the C# sentence under the field named by `field`. Otherwise show it at the top of the feature section. Do not rewrite the sentence. "Hole at (118, 70) is outside the 120 × 80 mm stock." is the right message.

## Security in the client

- No `innerHTML`, no `bypassSecurityTrust*`. Chat text renders with default interpolation.
- No inline `<script>` in `index.html`; `optimization.styles.inlineCritical` off so the CSP in `security.md` holds.
- No key, model name, or provider URL anywhere in the bundle. CI greps the build output for `x.ai` and `XAI_`.

## What not to add

- A second theme or a theme toggle.
- A component library that replaces the palette. Ask before adding one.
- Three.js in the first build. The solid view is a later phase and must obey the shop frame in `GROK.md`.
- Client-side calls to OpenAI or xAI SDKs.
- `localStorage` for anything but the last-open part id and zoom.

## Check before calling the frontend done

Automated in [testing.md](testing.md); also check by eye at 1440 × 900 and 1280 × 720.

- Keyboard select, hole, pocket, slot, nudge, delete, undo, and redo work with no mouse.
- A hole dragged outside the plate snaps back to the saved part and shows the 422 sentence.
- The four-corner starter sentence, against the stub provider, changes the drawing only after the trace shows `add_corner_holes` ok.
- With no key, the same sentence shows the 503 sentence and the plate does not change.
- Editing in two tabs: the second save shows the reload sentence, not a silent overwrite.
- The program view contains the training warning, and a hostile part name does not appear raw in the G-code comment.
- At 1440 × 900 the stock size and the selected feature's numbers are visible without scrolling.
- axe-core reports no serious or critical violations on Draw, Program, and Rejected.
