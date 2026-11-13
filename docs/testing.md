# Testing

Status: approved 2026-11-13. What gets tested, where, and what CI blocks on. Test names follow `/Users/richard/Desktop/coding-practices.md`: C# methods are `test_<behavior>_when_<condition>`, TypeScript is `it("does X when Y")`.

## Layers

| Layer | Tool | Lives in | Covers |
| --- | --- | --- | --- |
| Domain unit | xUnit | `api/tests/Plate.Domain.Tests` | `Apply`, every limit, geometry, tap table, `ProgramBuilder` |
| G-code golden | xUnit + checked-in `.nc` files | `api/tests/Plate.Domain.Tests/Golden/` | Byte-identical output for fixed parts |
| Property | FsCheck (xUnit) | same | Random actions never leave a stored part that breaks a limit |
| API integration | `WebApplicationFactory`, real SQLite file per test | `api/tests/Plate.Api.Tests` | Routes, status codes, error body, versioning, revisions, Origin/Host checks |
| Grok loop | Fake `HttpMessageHandler` with scripted provider replies | same | Tool loop, retries, timeouts, lock, 503 |
| Migrations | Integration | same | Upgrading `fixtures/plate-vN.db` keeps every part |
| Frontend unit | Angular CLI default runner | next to the file, `*.spec.ts` | Store transitions, hit testing, coordinate transform, keyboard map |
| End to end | Playwright against `docker compose -f compose.yaml -f compose.test.yaml` | `web/e2e` | The done checklist in `frontend.md` |
| Accessibility | `@axe-core/playwright` | `web/e2e` | No serious/critical violations on Draw, Program, Rejected |

`compose.test.yaml` adds a `stub-xai` service (a 40-line ASP.NET app in `api/tests/StubXai`) that replays scripted completions, and points `XAI_BASE_URL` at it. E2E never calls the real provider.

## Tests that must exist before the matching code is called done

Domain:

- `test_apply_rejects_hole_when_outside_stock`: 422 `outside_stock`, part unchanged.
- `test_set_stock_rejects_when_it_orphans_a_feature`
- `test_apply_rejects_feature_when_within_1mm_of_another`
- `test_apply_rejects_slot_when_rotated_capsule_leaves_stock` (bounding box would pass)
- `test_apply_rejects_number_when_nan_or_infinity`
- `test_add_corner_holes_places_four_holes_when_inset_is_12`
- `test_pattern_commits_nothing_when_one_hole_fails`
- `test_tap_drill_table_matches_iso_coarse` (M3 2.5 … M12 10.2)
- `test_blind_hole_rejected_when_drill_point_breaks_through`

G-code:

- `test_program_never_emits_coordinate_when_feature_is_outside` 
- `test_m6_through_hole_emits_5mm_drill_and_z_minus_14_when_plate_is_12mm`
- `test_comment_strips_parens_newlines_percent_when_name_is_hostile`
- `test_program_is_byte_identical_when_culture_is_de_de`
- `test_pocket_tool_diameter_is_at_most_twice_corner_radius`
- `test_every_pocket_move_keeps_tool_inside_pocket`
- `test_program_has_no_g28_g30_when_any_part`
- `test_runnable_is_false_when_any_feature_skipped`
- Golden files: blank plate, four corner M6, bolt circle M5 × 6, pocket 40 × 18, mixed.

API:

- `test_action_returns_409_when_version_is_stale`
- `test_undo_restores_previous_snapshot_as_new_revision`
- `test_post_returns_415_when_content_type_is_text_plain`
- `test_post_returns_403_when_origin_is_foreign`
- `test_request_returns_400_when_host_is_not_allowed`
- `test_error_body_has_error_code_and_request_id`
- `test_delete_removes_features_revisions_and_chat`

Grok loop:

- `test_failed_tool_is_returned_to_model_and_part_unchanged_when_apply_returns_422`
- `test_provider_body_never_contains_api_key`
- `test_chat_returns_503_and_health_reports_grok_false_when_key_missing`
- `test_loop_stops_after_8_rounds_when_model_keeps_calling_tools`
- `test_actions_return_409_grok_busy_when_chat_turn_is_running`
- `test_provider_retried_twice_when_503_then_succeeds`
- `test_turn_returns_504_with_partial_trace_when_budget_exceeded`
- `test_turn_is_stored_cancelled_when_client_disconnects`

Frontend unit and e2e: one test per line of the "Check before calling the frontend done" list in `frontend.md`.

## Coverage

`Plate.Domain` line coverage ≥ 90%, branch ≥ 80%, enforced in CI. No coverage gate on the Angular app; the e2e list is the gate.

## CI (GitHub Actions)

Runs on every push and pull request. All jobs in the workflow must pass to merge.

`.github/workflows/ci.yml` runs `secrets`, `api`, and `images`. Add `web` and `e2e` when those projects exist. `images` builds both Dockerfiles for the runner arch and does not push.

| Job | Steps |
| --- | --- |
| `api` | `dotnet restore --locked-mode`, `dotnet format --verify-no-changes`, `dotnet build -warnaserror`, `dotnet test` with coverage gate, `dotnet list package --vulnerable` fails on any |
| `web` | `npm ci`, `ng lint`, `prettier --check`, `ng test --watch=false`, `ng build`, grep the bundle for `x.ai` and `XAI_`, OpenAPI type drift check, `npm audit --audit-level=high` |
| `e2e` | Build images, `docker compose -f compose.yaml -f compose.test.yaml up -d --wait`, Playwright + axe, upload the report and traces on failure |
| `secrets` | gitleaks on the full history |
| `images` | Build `web` and `api` for `linux/amd64` and `linux/arm64`; on a tag, push with the version |

## Done means verified

From the coding rules, applied here: before a commit is handed over, `dotnet test`, `ng test`, `ng lint`, `dotnet format --verify-no-changes`, and both builds pass locally. For UI changes, run the app and compare against the Figma board. If anything fails, show the output.
