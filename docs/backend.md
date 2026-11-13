# Backend

Status: approved 2026-11-13. One C# process (`api`). It stores the part, validates actions, keeps revisions, writes G-code, and calls Grok. It assumes exactly one `api` instance; the per-part lock below is in-process.

## Layout, when we create it

```
api/
  Plate.sln
  Directory.Build.props        nullable on, warnings as errors, analyzers on
  Directory.Packages.props     central package versions
  src/
    Plate.Domain/              part, actions, geometry, validation, ProgramBuilder. No ASP.NET, no EF, no HTTP.
    Plate.Data/                EF Core DbContext, entity configs, migrations, revision store
    Plate.Grok/                xAI HTTP client, tool schemas, ToolLoop
    Plate.Api/                 Program.cs, endpoints, middleware, DI wiring
  tests/
    Plate.Domain.Tests/        unit
    Plate.Api.Tests/           integration (WebApplicationFactory + SQLite file per test)
  Dockerfile
```

Dependency direction: `Api → Grok → Domain`, `Api → Data → Domain`. `Domain` references nothing in the solution. `Domain` defines `IPartCommands`; `Data` implements it; `Grok` and `Api` call it through DI. Diagram: [diagrams/uml-component-plate.drawio](diagrams/uml-component-plate.drawio). Tests call the domain directly. The Grok loop is tested with a fake `HttpMessageHandler`, never the live API.

## Data model

SQLite through EF Core. Columns are the source of truth. GUIDs are generated in C# (`Guid.CreateVersion7()`), never by the model. Times are UTC, stored as ISO-8601 text. Lengths are `REAL` millimeters. Diagram: [diagrams/erd-plate.drawio](diagrams/erd-plate.drawio).

| Table | Columns | Notes |
| --- | --- | --- |
| `parts` | `id` PK, `name`, `material`, `length_mm`, `width_mm`, `thickness_mm`, `version` INT, `created_at`, `updated_at` | `version` starts at 1 and increments on every accepted change. It is the EF concurrency token. |
| `features` | `id` PK, `part_id` FK, `type`, `x_mm`, `y_mm`, `depth_mm`, `through` BOOL, nullable `diameter_mm`, `thread`, `length_mm`, `width_mm`, `corner_radius_mm`, `angle_deg`, `sort_order` INT | `type` CHECK in (`hole`, `pocket`, `slot`). Cascade delete with the part. |
| `part_revisions` | `id` PK, `part_id` FK, `version` INT, `source`, `action`, `args_json`, `snapshot_json`, `chat_message_id` FK null, `created_at` | UNIQUE (`part_id`, `version`). `source` CHECK in (`user`, `grok`, `undo`, `redo`). One row per accepted change. Keeps the last 200 per part. |
| `chat_messages` | `id` PK, `part_id` FK, `role`, `body`, `trace_json` null, `status`, `model` null, `created_at` | `role` CHECK in (`user`, `assistant`). `status` CHECK in (`ok`, `provider_error`, `timeout`, `cancelled`). |

Indexes: `features(part_id, sort_order)`, `part_revisions(part_id, version)` unique, `chat_messages(part_id, created_at)`.

Connection pragmas on open: `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000`, `synchronous=NORMAL`.

Migrations are EF Core migrations checked into `Plate.Data/Migrations`. At startup the API copies `plate.db` to `/data/backups/plate-<utc>-pre-<migration>.db` if any migration is pending, then applies them. A failed migration stops the process; `/health/ready` never goes green on a half-migrated file.

## Limits

| Field | Rule |
| --- | --- |
| Name | 1–40 characters after the comment sanitize rule (letters, digits, space, hyphen, underscore) |
| Material | One of `6061-T6`, `7075-T6`, `MIC-6`, `Delrin`, `HDPE`. Confirmed 2026-11-13. Feeds and speeds are placeholders and the operation text says so. |
| Stock length and width | 5–500 mm |
| Thickness | 1–100 mm |
| Hole drilled diameter | 0.5–50 mm |
| Thread | Empty, or M3, M4, M5, M6, M8, M10, M12 |
| Blind hole | depth + 0.3 × diameter ≤ thickness − 0.5 mm, otherwise it must be `through` |
| Pocket | length and width ≥ 2 mm; 0.5 ≤ depth ≤ thickness − 0.5 mm; corner radius 0.5 mm to half the short side (default 2 mm) |
| Slot | width ≥ 1 mm; length ≥ width; 0.5 ≤ depth ≤ thickness − 0.5 mm; angle −180 to 180 |
| Edge wall | Every feature's outline is at least 1.0 mm inside the stock outline |
| Feature wall | Outlines of two features do not overlap and are at least 1.0 mm apart |
| Feature count | ≤ 200 per part |
| Bolt circle count | 1–24 |
| Grid | 1–10 rows and columns |
| Any number | Finite. NaN, ±Infinity, and strings that look like numbers are rejected. |

Geometry comparisons use a 1e-6 mm tolerance. Slot containment and spacing are tested on the rotated capsule, not its bounding box.

Tap drill millimeters, locked by a test: M3 2.5, M4 3.3, M5 4.2, M6 5.0, M8 6.8, M10 8.5, M12 10.2.

## Actions

`Apply(part, actionName, args) -> Result<Part, ApplyError>`, pure. Persistence, versioning, and revisions sit one layer up in `PartCommands.Execute(partId, expectedVersion, source, actionName, args)`.

| Action | Args |
| --- | --- |
| `set_stock` | length, width, thickness |
| `set_material` | material |
| `set_name` | name |
| `add_hole` | x, y, through (default true) or depth, diameter optional if thread is set, thread optional |
| `add_corner_holes` | inset, thread or diameter, through or depth |
| `add_bolt_circle` | cx, cy, circle diameter through centers, count, start angle degrees, thread or diameter, through or depth |
| `add_hole_grid` | x, y of the first hole, rows, cols, pitch_x, pitch_y, thread or diameter, through or depth |
| `add_pocket` | x, y center, length, width, depth, corner radius (default 2) |
| `add_slot` | x, y center, length, width, depth, angle degrees |
| `update_feature` | id plus fields legal for that type |
| `move_feature` | id, x, y |
| `remove_feature` | id |
| `clear_features` | none |

Angle 0 is +X, counterclockwise toward +Y.

`add_corner_holes` exists so the model does not do the inset math. The model chooses the tool. C# places the holes. A pattern is one action, one revision, all or nothing.

Undo and redo are not tools Grok can call. They are user endpoints that restore a revision snapshot as a new revision (`source = undo` / `redo`), so history only grows and the stored part is always what the user sees.

## HTTP

All bodies are `application/json`. Any other `Content-Type` on a POST is 415. Bodies over 64 KB are 413. Every mutating request carries the part `version` the client last saw.

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| GET | `/health/live` | none | 200 when the process runs |
| GET | `/health/ready` | none | 200 when SQLite opens and no migration is pending. Body `{ "db": true, "grok": true\|false }`; `grok` is key and model presence, never a provider call. |
| GET | `/api/parts` | none | `[{ id, name, material, updatedAt }]`, newest first, max 500 |
| POST | `/api/parts` | `{ name?, material?, length?, width?, thickness? }` | 201 part. Missing fields take the PLATE-001 defaults. |
| GET | `/api/parts/{id}` | none | Part with features and `version` |
| POST | `/api/parts/{id}/actions` | `{ name, args, version }` | 200 part |
| POST | `/api/parts/{id}/undo` | `{ version }` | 200 part |
| POST | `/api/parts/{id}/redo` | `{ version }` | 200 part |
| GET | `/api/parts/{id}/revisions` | none | `[{ version, source, action, createdAt }]`, newest first, max 50 |
| GET | `/api/parts/{id}/program` | none | `{ lines, operations, issues, runnable, moves }` |
| POST | `/api/parts/{id}/chat` | `{ message, version }` | 200 `{ reply, trace, part }` |
| GET | `/api/parts/{id}/chat` | none | Last 50 messages |
| DELETE | `/api/parts/{id}` | none | 204. Deletes features, revisions, and chat. |

Error body, every non-2xx:

```json
{ "error": "Hole at (130, 40) is outside the 120 × 80 mm stock.", "code": "outside_stock", "field": "x", "requestId": "0HN…" }
```

`error` is one sentence with the numbers, shown verbatim in the UI. `code` is a stable snake_case value the frontend can switch on. `field` is the arg name when one arg caused it, otherwise omitted.

| Status | When | Example `code` |
| --- | --- | --- |
| 400 | Malformed JSON, missing `version` | `bad_request` |
| 404 | Part or feature id not found | `not_found` |
| 409 | `version` is stale, or a chat turn holds the part | `version_conflict`, `grok_busy` |
| 413 | Body over 64 KB, chat message over 2,000 chars | `too_large` |
| 415 | Not `application/json` | `unsupported_media_type` |
| 422 | `Apply` refused | `outside_stock`, `overlap`, `limit`, `unknown_action`, `invalid_args`, `nothing_to_undo` |
| 429 | Chat rate or daily limit | `rate_limited` |
| 502 | xAI returned an error after retries | `provider_error` |
| 503 | `XAI_API_KEY` or `GROK_MODEL` missing | `grok_not_configured` |
| 504 | Turn exceeded its time budget | `provider_timeout` |

Chat response:

```json
{
  "reply": "Added four M6 through holes, 12 mm in from each corner.",
  "trace": [
    { "name": "add_corner_holes", "args": { "inset": 12, "thread": "M6" }, "ok": true, "error": null, "code": null, "version": 2 }
  ],
  "part": { "id": "…", "version": 2, "features": [] }
}
```

On 502 and 504 the body still includes `trace` and `part`, because steps that passed were committed.

## Grok loop

Configuration: `XAI_API_KEY`, `GROK_MODEL`, `XAI_BASE_URL` (default `https://api.x.ai/v1`; must be `https` unless the environment is `Development` or `Test`). Full table in [operations.md](operations.md).

1. Refuse with 503 if the key or model is missing. Check the chat rate limit (429).
2. Take the per-part lock (`SemaphoreSlim` keyed by part id, no wait). If it is held, 409 `grok_busy`. While held, `/actions`, `/undo`, and `/redo` on that part also return 409 `grok_busy`.
3. Load the part. Check `version` (409 on mismatch). Store the user message.
4. Build the request: system prompt, the part as JSON, the last 10 user and assistant texts (at most 8,000 characters, oldest dropped first), the new message, and the tool schemas generated from the action table. `max_tokens` 1,024. `tool_choice: auto`.
5. On tool calls, run them in the order returned. Each one goes through `PartCommands.Execute` with `source = grok` and its own revision. A failure does not stop later calls in the same round. Each result goes back as a tool message: the one-line summary, or the 422 sentence.
6. Stop at 8 rounds, when the model returns text with no tool calls, when the client disconnects (`cancelled`), or when the 90 s turn budget runs out (504).
7. If it stops on a tool call with no text, build one sentence from the trace. No extra provider call.
8. Store the assistant message with `trace_json`, `status`, and `model`. Release the lock in a `finally`.

Provider HTTP: `HttpClient` from `IHttpClientFactory`, 30 s per request. Retry 429, 500, 502, 503, and 504 up to twice with 1 s and 3 s backoff, honoring `Retry-After` up to 10 s. No retry on other 4xx. Retrying a completion is safe because tool results already applied are part of the resent thread, not re-applied.

Tool schemas: JSON Schema with `additionalProperties: false`, numeric bounds from the limits table, and string `maxLength`. Arguments that do not parse against the schema are a failed tool call (`invalid_args`), not an exception.

System prompt, in substance: edit only by tools, never write G-code, units and origin as in `GROK.md`, prefer pattern tools over repeated `add_hole`, on a tool error either retry with corrected numbers or explain why it does not fit, then two or three sentences on what changed. Never say the program is safe to run. The prompt lives in `Plate.Grok/SystemPrompt.md`, embedded at build time, so a diff shows prompt changes.

After each accepted `Execute`, the next provider round sees the updated part JSON.

Rate limits (config): 10 chat turns per minute, `CHAT_DAILY_LIMIT` per UTC day (default 200).

## G-code

`ProgramBuilder` takes a stored part and returns `lines`, `operations`, `issues`, `runnable`, and `moves` (the toolpath polyline for a later overlay). It is pure and deterministic: the same part gives byte-identical text.

Formatting: every number goes through one formatter using `CultureInfo.InvariantCulture`, fixed three decimals, no exponent, `-0.000` printed as `0.000`. A machine set to a comma-decimal locale must not change the file.

Structure:

1. `%`, then comments: sanitized part name, `TRAINING OUTPUT - DO NOT RUN ON A MACHINE`, units and origin, stock size, material, generator version.
2. `G21 G90 G17 G94`, then `G54`. Nothing from model text appears outside a sanitized comment.
3. Operations, numbered 10, 20, …:
   - Drilling, grouped by drill diameter, smallest first. One tool per diameter: `T<n> M06`, `G43 H<n>` (`H` equals `T`), `S<rpm> M03`, `G00 Z25.000`, `G00` to the first hole, `G81 … R2.000 F<feed>` then bare `X Y` for the rest, `G80`, `G00 Z25.000`, `M05`. Holes in a group are ordered nearest-neighbour from the origin. Every later tool change follows the same `T<n> M06` then `G43 H<n>` pair.
   - Hole depth: through holes go to `Z-(thickness + 0.3 × D + 0.5)`; the 0.3 × D is the 118° drill point and 0.5 mm is breakout. Blind holes go to `Z-(depth + 0.3 × D)` so the full diameter reaches `depth`.
   - Pockets: one end mill from 1, 2, 3, 4, 6, 8, 10, 12 mm, the largest with diameter ≤ 2 × corner radius and ≤ the short side. Contour-parallel offsets at 40% stepover, axial passes of at most 0.5 × D, equal-split to the floor. Straight plunge at the pocket center at the plunge feed (center-cutting end mill assumed, stated in the operation text).
   - Slots: the largest end mill ≤ slot width. If equal, one centerline pass per depth step; otherwise centerline plus offsets. Same axial rule.
   - Taps: listed as an operation with "not in this file". No motion.
4. `G49`, `M30`, `%`. (Each operation already ended at Z25 with the spindle stopped.)

Feeds and speeds come from a static table keyed by material and tool. Every value is labeled a placeholder in the operation text.

Never emitted: `G28`, `G30`, a second work offset, `M98`/`M99`, or any line built from model text. `G43 H<n>` is required after each tool change. `G49` is required once, immediately before `M30`.

`runnable` is false when any feature was skipped or any issue is an error. `issues` are `{ featureId, severity, message }`. Threaded holes add a warning that the tap is not in the file.

Tests are listed in [testing.md](testing.md). The anchors: an outside feature never appears as a coordinate; an M6 through hole in a 12 mm plate emits a 5.0 mm drill and `Z-14.000`; a hostile part name does not break out of the comment; the output under `de-DE` culture is byte-identical to `en-US`; a golden file per starter prompt.
