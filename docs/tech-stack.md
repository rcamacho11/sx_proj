# Tech stack

Status: approved 2026-11-13. Versions get pinned the day we scaffold and are then changed only by Dependabot PRs or a `chore:` commit.

## Chosen stack

| Piece | Choice | Why |
| --- | --- | --- |
| Frontend | Angular (current major), TypeScript strict | Richard's choice. Also the framework named first on the Components posting. |
| API | ASP.NET Core minimal APIs on the current .NET LTS | One process owns rules, the database, G-code, and the Grok loop. |
| Model API | xAI HTTP, base `https://api.x.ai/v1`, OpenAI-compatible chat completions with tools | C# can call it with `HttpClient`. No Python. Model id is `GROK_MODEL`, checked against docs.x.ai at scaffold time. |
| Database | SQLite via EF Core, WAL mode | One file on the laptop, no server. |
| API contract | ASP.NET Core built-in OpenAPI document; TypeScript types generated from it | One contract, checked for drift in CI. |
| Run | Docker Compose | `web`, `api`. |
| Tests | xUnit for domain, G-code, and endpoints; the Angular CLI's runner for view logic; Playwright for end-to-end | See [testing.md](testing.md). |
| CI | GitHub Actions | Build, lint, test, e2e, secret scan, vulnerability scan, image build. |
| Lint / format | `dotnet format`, .NET analyzers as errors; ESLint (angular-eslint) and Prettier | One style, enforced in CI. |

## What SpaceX has said, for context

Application software described older factory apps as AngularJS, C#, and SQL Server, then newer apps as Angular, with containers and a move toward PostgreSQL (Stack Overflow, 13 May 2021, Sepanloo and Madonia). The Components posting lists C#, .NET, Python, JavaScript, Angular or React, Docker, and PostgreSQL or SQL Server. Python is on that list. This app does not use it, because the Grok API does not require it. Flight software is a different stack. Plate is not that.

If the app ever moves to PostgreSQL, the change is the EF provider and a fresh migration set; no SQLite-specific SQL is allowed in `Plate.Data` outside the pragma setup.

## Containers

Diagram: [diagrams/uml-deploy-compose.drawio](diagrams/uml-deploy-compose.drawio).

```
host 127.0.0.1:8088
  └─ web  (nginx-unprivileged, :8080 inside)     static Angular build, security headers
        └─ /api/ ──► api:8080  (no host port)    ASP.NET Core, non-root
                       ├─ volume plate-data → /data/plate.db, /data/backups/
                       └─ HTTPS → XAI_BASE_URL
```

- The browser never calls xAI.
- `api` is reachable only on the Compose network.
- In dev, `ng serve` proxies `/api` to `http://localhost:5080` where `dotnet run` listens.
- Health: `api` has `/health/live` and `/health/ready`; `web` has `/healthz` (static 200). Compose `web` depends on `api` being healthy.

No Redis, no queue, no Kubernetes, no second language runtime.

## Request shapes

Save from the drawing:

```
browser  →  POST /api/parts/{id}/actions   { "name": "add_hole", "args": { }, "version": 7 }
api      →  check version, Apply on a copy, write part + features + revision in one transaction
api      →  200 part (version 8) | 409 | 422
```

Talk to Grok:

```
browser  →  POST /api/parts/{id}/chat      { "message": "...", "version": 8 }
api      →  lock the part, load it
api      →  POST {XAI_BASE_URL}/chat/completions   tools = the action list
api      →  Execute(action) in-process for each tool call, one revision each
api      →  store the chat turn, unlock, return reply + trace + part
```

Sequence: [diagrams/uml-seq-chat.drawio](diagrams/uml-seq-chat.drawio).

## Local run, once it exists

`cp .env.example .env`, fill in the key and model if you want Grok, then `docker compose up --build`. Open `http://localhost:8088`. Details, backups, and troubleshooting: [operations.md](operations.md).

## Explicit non-choices

| Not using | Why |
| --- | --- |
| Python | The provider API is HTTP. A sidecar would be a second source of truth. |
| React | Richard chose Angular. |
| Postgres in Docker for v1 | He asked for SQLite. The EF layer keeps the door open. |
| A CAD engine as the source of truth | The plate model in C# is the source of truth. |
| Letting the model emit raw G-code | C# generates it from the stored part. |
| An OpenAI or xAI SDK | Plain `HttpClient` plus typed DTOs keeps the request visible and testable with a fake handler. Revisit if tool-calling changes shape. |
| Serilog or another logging stack | Built-in JSON console logging is enough for one process. |
