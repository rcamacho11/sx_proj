# Operations

Status: approved 2026-11-13. How Plate is configured, run, backed up, upgraded, and debugged on one laptop. Nothing here exists until the Compose step in `GROK.md`'s order of work.

## Configuration

All configuration is environment variables on `api`, loaded by Compose from `.env`. `.env.example` lists every name with an empty or safe value; an empty value means the default. `web` receives nothing secret.

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `XAI_API_KEY` | For Grok | empty | xAI key. Missing → chat returns 503, drawing works. |
| `GROK_MODEL` | For Grok | empty | Model id from docs.x.ai. Missing → same 503. |
| `XAI_BASE_URL` | No | `https://api.x.ai/v1` | Points at the stub provider in tests. Must be `https` outside Development/Test. |
| `PLATE_DB_PATH` | No | `/data/plate.db` | SQLite file |
| `PLATE_PUBLIC_ORIGIN` | No | `http://localhost:8088` | The only `Origin` accepted on POST and DELETE |
| `PLATE_WEB_PORT` | No | `8088` | Host port for `web`, bound to 127.0.0.1 |
| `CHAT_DAILY_LIMIT` | No | `200` | Chat turns per UTC day |
| `LOG_LEVEL` | No | `Information` | `Debug` adds per-round timings |
| `LOG_CHAT_BODIES` | No | `false` | Log chat text. Local debugging only. |

The API validates configuration at startup with `ValidateOnStart`. A bad value (for example a non-https `XAI_BASE_URL` in Production) stops the process with one log line naming the variable.

## Run

```
cp .env.example .env          # once; fill XAI_API_KEY and GROK_MODEL to enable Grok
docker compose up --build -d
open http://localhost:8088
docker compose ps             # both services "healthy"
docker compose logs -f api
docker compose down           # stop; the volume and your parts stay
```

Dev loop without containers: `dotnet run --project api/src/Plate.Api` (listens on 5080, DB at `./.data/plate.db`) and `npm start` in `web/` (proxies `/api` to 5080).

## Health

| Probe | Healthy when |
| --- | --- |
| `api` `/health/live` | Process is up |
| `api` `/health/ready` | SQLite opens, `PRAGMA quick_check` is `ok` at startup, no pending migration. Body reports `grok: true/false`. |
| `web` `/healthz` | nginx is serving |

Compose healthchecks use `/health/ready` and `/healthz` every 10 s; `web` starts after `api` is healthy.

Compose limits: `api` 512 MB and 128 pids, `web` 128 MB and 128 pids.

This build has no EF migration assembly. `/health/ready` returns 503 when `IPendingMigrations` reports any pending migration. The data step wires that check to EF. Until then the list is empty, so a healthy process is the SQLite open plus `PRAGMA quick_check`.

## Logs

JSON to stdout, one object per line, read with `docker compose logs`. Every line from a request carries `requestId` (from `X-Request-Id` or generated) and `partId` when there is one.

Logged per request: method, route template, status, duration. Per action: action name, `ok` or `code`, new version. Per chat turn: rounds, tool calls ok/failed, provider latency per round, prompt and completion tokens, final status.

Never logged: the key, the `Authorization` header, provider bodies, chat text (unless `LOG_CHAT_BODIES=true`).

## Data and backups

The database is `plate.db` on the named volume `plate-data`, mounted at `/data`.

- Before applying a migration, the API writes `/data/backups/plate-<utc>-pre-<migration>.db`. It keeps the last 10.
- Manual backup (consistent, because a clean stop checkpoints the WAL):

  ```
  docker compose stop api
  docker run --rm -v plate_plate-data:/data -v "$PWD/backups:/out" alpine cp /data/plate.db /out/plate-$(date +%F).db
  docker compose start api
  ```

- Restore: stop `api`, copy the backup over `/data/plate.db` the same way, delete any `plate.db-wal` and `plate.db-shm`, start `api`.
- `backups/` is gitignored.
- Reset everything: `docker compose down -v` deletes the volume and every part. There is no undo for that.

## Upgrades

- Dependabot opens weekly PRs for NuGet, npm, GitHub Actions, and Docker base image digests. CI must be green to merge.
- A migration ships in the same PR as the model change, with a test that migrates a copy of the previous release's database (`tests/fixtures/plate-vN.db`).
- Release: tag `vX.Y.Z`, CI builds both images with that tag. The G-code header carries the same version.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Page loads, every save says "Could not reach the API" | `docker compose ps`; `api` unhealthy → `docker compose logs api` for the migration or config line |
| Grok panel says not configured | `XAI_API_KEY` and `GROK_MODEL` in `.env`, then `docker compose up -d api` (a restart reloads env) |
| Grok says limit reached | `CHAT_DAILY_LIMIT`; resets at 00:00 UTC |
| 403 on every save | You opened the app at a host other than `localhost:8088`; match `PLATE_PUBLIC_ORIGIN` |
| `database is locked` in logs | Another process opened the file on the volume; only `api` may |
| Port 8088 in use | Set `PLATE_WEB_PORT` and `PLATE_PUBLIC_ORIGIN` together |
