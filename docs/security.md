# Security

Status: approved 2026-11-13. Local, single-user app on a laptop. No accounts in v1. Do not add a fake login. "Local" does not mean "no attacker": any web page open in the same browser can send requests to `localhost`.

## What we are protecting

| Asset | Where it lives | Worst realistic outcome |
| --- | --- | --- |
| `XAI_API_KEY` | `api` process environment | Billed by whoever finds it, or committed to git |
| xAI spend | The key's account | A hostile web page or a loop runs up the bill |
| The part database | SQLite file on a Docker volume | Lost or corrupted work, or a stray copy in git |
| The G-code text | Generated on demand | Someone runs it on a machine |
| Tool arguments | From the browser or from the model | A hole outside the plate, or a comment that breaks into motion |

## Threats and controls

| Threat | Control |
| --- | --- |
| A web page in another tab POSTs to `http://localhost:8088/api/...` (CSRF) to burn credits or delete parts | Unsafe methods require `Content-Type: application/json` (this forces a CORS preflight, which is never approved) and an `Origin` header that matches `PLATE_PUBLIC_ORIGIN`. Otherwise 403. |
| DNS rebinding: `evil.example` resolves to 127.0.0.1 and becomes same-origin | ASP.NET `AllowedHosts` = `localhost;127.0.0.1`; nginx `server_name localhost 127.0.0.1` with a default server returning 444 for any other `Host`. |
| Another device on the LAN reaches the app | `web` publishes `127.0.0.1:8088` only. `api` publishes no port; nginx reaches it on the Compose network. |
| Prompt injection via the part name or chat history steers Grok | Grok's only power is `Apply`, which validates every call. Its worst outcome is legal but unwanted geometry, which undo reverses. It cannot call undo, delete a part, or reach the filesystem. |
| Model text becomes a motion line | G-code is built from stored numbers only. Model text never reaches `ProgramBuilder`. |
| Runaway tool loop or spend | 8 rounds, 90 s per turn, `max_tokens` 1,024, 10 turns per minute, `CHAT_DAILY_LIMIT` per day. |
| Large or malformed bodies | 64 KB request limit, 2,000-character chat message, strict JSON Schema on tool args, finite-number check. |
| Key leaks through logs or errors | Logs never include the key, the `Authorization` header, or provider request bodies. Exceptions are caught at the edge and returned as the error body with a `requestId`, never a stack trace. |
| Key leaks through git | `.env` is gitignored, `.env.example` has empty values, gitleaks runs in CI and as a pre-commit hook. |
| Vulnerable dependency | Central package versions, `package-lock.json`, Dependabot weekly, CI fails on `dotnet list package --vulnerable` and `npm audit --audit-level=high`. |
| Compromised base image | Base images pinned by digest, updated by Dependabot. |

The system prompt is not the control. The control is that model text never becomes a motion line and every edit passes `Apply`.

## Network

- Browser to `web` only. nginx serves the Angular build and proxies `/api/` to `api:8080` on the internal network.
- Same origin, so no CORS policy is configured at all. Do not add `AllowAnyOrigin`.
- `api` makes one kind of outbound call: HTTPS to `XAI_BASE_URL`. The browser never calls xAI.
- Swagger UI and `GET /openapi/v1.json` are mapped only when the environment is Development and `PLATE_API_DOCS` is exactly `true`. Compose runs Production and does not set the flag. nginx answers 404 for `/docs`, `/openapi`, and `/swagger`. `api` publishes no host port.

nginx response headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Cross-Origin-Opener-Policy: same-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

`style-src 'unsafe-inline'` is there because Angular adds component styles at runtime. Scripts stay `'self'`.

## The API key

- Read from the `api` environment only. Compose loads it from `.env` into `api` only, never into `web`.
- Never in Angular `environment.ts`, a build arg, or any `NG_` variable.
- Log "xAI key present" or "xAI key missing" once at startup.
- If the key or model is missing, chat returns 503 `{ "error": "Grok is not configured. The drawing still works.", "code": "grok_not_configured" }`. Drawing still works.
- Tests assert the outbound request body never contains the key; it is only the `Authorization` header.

## Validation

One C# path, `PartCommands.Execute` → `Apply`, used by the action route and by the Grok tool loop.

- Unknown action names fail.
- Numbers must be finite and inside the limits table in `backend.md`.
- Features lie fully inside the stock with a 1 mm wall, and do not overlap.
- A stock change that orphans a feature fails, and the old part remains.
- Thread names must be in the tap-drill table.
- Patterns are one transaction.
- Apply on a copy. Commit the part, its features, and its revision in one EF transaction, and only if the whole action is valid.
- The expected `version` must match, or 409.
- EF Core writes every row. No SQL built by string concatenation.

## G-code

- Generator in C#, covered by tests, including golden files.
- Header includes the line that says not to run it on a machine.
- Motion numbers are formatted by one invariant-culture formatter from computed values.
- Comments may include the part name. Allow letters, digits, space, hyphen, underscore. Strip everything else, including newlines, parentheses, semicolons, and percent signs. Clamp to 40 characters.
- Do not emit `G28` or `G30`, and use one work offset (`G54`). After each tool change emit `G43 H<n>` with `H` equal to `T`. Emit `G49` once before `M30`.
- No "send to machine" control, no serial or network output, no DNC.

## Chat text

- Stored as data. Angular default binding only. No `innerHTML`.
- Never passed to a shell, `eval`, a file path, or SQL text.
- History sent to xAI is conversation text plus the part JSON. It never includes the key, the connection string, or another part.
- Not written to logs by default. `LOG_CHAT_BODIES=true` exists for local debugging and is off in `.env.example`.

## Containers

- `api`: ASP.NET runtime image, runs as the non-root `app` user, `read_only: true` root filesystem, `tmpfs: /tmp`, writable only at `/data`.
- `web`: unprivileged nginx image (listens on 8080 inside), `read_only: true`, tmpfs for its cache and pid.
- Both: `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`, memory limit, healthcheck, `restart: unless-stopped`.

## SQLite file

- Gitignored. Lives only on the `plate-data` volume.
- Owned by the `api` user. Backups follow `docs/operations.md`.

## Out of scope on purpose

Shop-floor auth, multi-user, ITAR boundaries, and a real machine post. If auth or a network deployment is wanted later, that is a new design pass. The Origin and Host checks are not a substitute for auth.
