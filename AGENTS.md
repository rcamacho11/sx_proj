# Plate: agent rules

Read `GROK.md`, then the doc for the area you touch. Richard's coding rules are `/Users/richard/Desktop/coding-practices.md`. They win over this file when they disagree.

## Standing orders

- Richard approved `docs/design-artifact.md` on 2026-11-13. Follow the order of work in `GROK.md`. A new screen still needs its Figma board first. If `node ~/Desktop/projects/figma-agent-bridge-master/run.js --status` does not say the plugin is connected, stop on any UI work and say so.
- Figma pages may be unloaded; scripts that read pages call `await figma.loadAllPagesAsync()` first.
- Never run `git commit`. Hand him `git add :/<path>` and a one-line message. No `Co-Authored-By`.
- Never push. Richard pushes. Do not run `git push` or any command that publishes the branch. Hand him the command and stop.
- Never commit `.env`, a database file, or an API key. `.env.example` has empty placeholders.
- "Done" means the checks in `docs/testing.md` pass locally, with output shown if they do not.
- Never use an em dash in docs, UI copy, comments, or replies. Use a period, comma, colon, or parentheses.

## Stack (decided)

- Angular and TypeScript. Not React.
- ASP.NET Core in C#. SQLite through EF Core. Docker Compose services: `web`, `api`.
- No Python service. The xAI API is HTTP and OpenAI-compatible, so C# calls `https://api.x.ai/v1`.
- Browser talks only to the C# API, same origin. `XAI_API_KEY` lives in the `api` process environment.
- C# is the only place that validates geometry and the only place that writes G-code.

## Look

Summary only; the token table in `docs/design.md` is the source and wins on any difference.

Void `#000000`, mat `#1C1F24`, surfaces `#171A20`, text `#F0F0FA`, muted `#CCCCCC`, dim `#8E939C`, rule `#393C41`, field border `#6B7280`. Ghost buttons, 4px radius, uppercase labels with tracking. Font: Barlow (stand-in for SpaceX D-DIN); G-code Roboto Mono. Error strokes `#E82127`, error text `#FF5A5F`. Grok live dot `#75FBA6` and nowhere else. The drawing is a light plate on the dark mat.

## Product

One rectangular plate in millimeters. Origin lower-left, top face. Holes, pockets, slots. Grok edits by tools. A rejected tool call does not change the part. Every accepted change is a revision. G-code is training output and must say not to run it on a machine. Sanitize part names before they enter a G-code comment.
