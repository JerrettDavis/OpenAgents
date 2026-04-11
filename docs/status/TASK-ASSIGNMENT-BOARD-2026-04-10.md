# Task Assignment Board — 2026-04-10

## Active Queue

| ID   | Workstream          | Task                                                 | Owner          | Status    | Validation                                                                            |
| ---- | ------------------- | ---------------------------------------------------- | -------------- | --------- | ------------------------------------------------------------------------------------- |
| A-01 | WS-A Backend/Domain | Add stage/task domain model + persistence            | Backend/Domain | Completed | API integration tests cover non-empty stage/task data                                 |
| A-02 | WS-A Backend/Domain | Replace stage/task endpoint stubs with real handlers | Backend/Domain | Completed | `/jobs/{id}/stages` and `/jobs/{id}/tasks` return persisted rows                      |
| B-01 | WS-B Runtime        | Wire runner lifecycle to stage/task transitions      | Runtime        | Completed | Runtime updates stage/task execution state and emits related events                   |
| B-02 | WS-B Runtime        | Harden container failure diagnostics/retries         | Runtime        | Planned   | Failure path tests + log validation pass                                              |
| C-01 | WS-C Frontend       | Implement workflows operational page                 | Frontend       | Completed | Build + route checks pass                                                             |
| C-02 | WS-C Frontend       | Implement artifacts operational page                 | Frontend       | Completed | Artifact listing API + UI validated                                                   |
| C-03 | WS-C Frontend       | Implement settings/provider management page          | Frontend       | Completed | Config visibility and error states validated                                          |
| D-01 | WS-D QA/Docs        | Keep status matrix synced per batch                  | QA/Docs        | Completed | Status docs updated to current implementation reality                                 |
| D-02 | WS-D QA/Docs        | Enforce pre-push gate checklist                      | QA/Docs        | Completed | Format/build/tests/type-check/e2e/compose checks green                                |
| D-03 | WS-D QA/Docs        | Add API coverage instrumentation and command         | QA/Docs        | Completed | `pnpm test:coverage:api` emits Cobertura XML coverage artifact                        |
| D-04 | WS-D QA/Docs        | Expand E2E behavior coverage with screenshot output  | QA/Docs        | Completed | 2 Playwright specs pass with screenshot artifacts across jobs/detail/dashboard routes |

## Validation Commands Baseline

- `dotnet test apps/orchestrator-api/OpenAgents.OrchestratorApi.csproj`
- `dotnet build apps/orchestrator-api/OpenAgents.OrchestratorApi.csproj`
- `pnpm --dir . --filter orchestrator-web type-check`
- `pnpm --dir . --filter orchestrator-web build`

## Notes

- No commit or push until all required stubs in active scope are closed and validated.
- Keep commit slices aligned to workstream IDs (A-xx/B-xx/C-xx/D-xx).
