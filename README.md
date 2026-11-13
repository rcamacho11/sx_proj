# Plate

A small CAD window for one rectangular plate a 3-axis mill could cut. Draw holes, pockets, and slots, or ask Grok to place them. C# checks every edit, keeps every revision, and writes a G-code program for study.

> The G-code is training output. Do not run it on a machine.

Status: design approved 2026-11-13. There is no application code yet, so the commands below describe the target. The build order is in `GROK.md`.

## Run

Requires Docker Desktop.

```
cp .env.example .env      # add XAI_API_KEY and GROK_MODEL to enable Grok; leave empty to draw only
docker compose up --build -d
open http://localhost:8088
```

Everything binds to 127.0.0.1. Parts live in the `plate-data` Docker volume. Backups, logs, and troubleshooting: [docs/operations.md](docs/operations.md).

## How it fits together

```
browser ── localhost:8088 ──► web (nginx, Angular build)
                                 └─ /api/ ──► api (ASP.NET Core) ──► SQLite on a volume
                                                    └─ HTTPS ──► api.x.ai (Grok tool calls)
```

- Angular draws and sends actions. It never decides whether geometry is legal and never calls xAI.
- C# validates every action, stores it as a revision, runs the Grok tool loop, and writes the program.
- Grok can only call the same actions the drawing tools use.

## Docs

Start with [GROK.md](GROK.md). Then: [design](docs/design.md) · [tech stack](docs/tech-stack.md) · [backend](docs/backend.md) · [frontend](docs/frontend.md) · [security](docs/security.md) · [operations](docs/operations.md) · [testing](docs/testing.md) · [diagrams](docs/diagrams/).

Mockups: `design/figma/out/*.png`, rebuilt from `design/figma/screens.js`.

## Not in v1

Assemblies, STEP, GD&T, 3D, accounts, inches as a unit, a machine connection.

## Look

The palette borrows from public SpaceX, Tesla, and xAI sites. It is not an official brand kit, and Plate is not affiliated with those companies.
