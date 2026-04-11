# OpenAgents Implementation Matrix (2026-04-10)

Legend: ✅ Implemented | 🟡 Partial | 🚧 Stubbed | ❌ Missing

| Area      | Capability                          | Status | Evidence                                                               | Gap / Risk                                              | Next Step                                          |
| --------- | ----------------------------------- | -----: | ---------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| Repo/Git  | Remote configured                   |     ✅ | `origin` set to `JerrettDavis/OpenAgents`                              | No baseline commits yet                                 | Create clean commit batches                        |
| Repo/Git  | Clean, navigable history            |     🟡 | Initial commit `097f747` exists                                        | Commit is too broad for ideal review hygiene            | Split/restructure into logical commits before push |
| Domain    | `Job` aggregate and lifecycle state |     🟡 | `packages/domain/Aggregates/Jobs/Job.cs`                               | Stage/task child entities not modeled                   | Add stage/task entities + invariants               |
| Domain    | `WorkflowDefinition` model          |     🟡 | `WorkflowDefinition.cs`                                                | Compatibility/policy child objects not modeled          | Add workflow schema-backed value objects           |
| Domain    | `Workspace` model                   |     🟡 | `Workspace.cs` baseline entity exists                                  | Git-tracking/validation TODO lifecycle still partial    | Implement workspace validation + git metadata      |
| API       | Health/system endpoints             |     ✅ | `Program.cs` maps health/system routes                                 | Docker availability hardcoded false                     | Add real runtime diagnostics                       |
| API       | Jobs CRUD + transitions             |     ✅ | `JobEndpoints.cs`                                                      | Some transition semantics simplified                    | Harden rules + idempotency behavior                |
| API       | Events/logs + SSE stream            |     ✅ | `JobEndpoints.cs`, `SseHub`, `JobEventService`                         | No global system stream endpoint despite helper in web  | Add `/api/v1/stream/system` or remove helper       |
| API       | Stages endpoint                     |     ✅ | `ListStagesAsync` returns persisted stage execution rows               | Deeper stage semantics still evolving                   | Expand stage lifecycle semantics and validations   |
| API       | Tasks endpoint                      |     ✅ | `ListTasksAsync` returns persisted task execution rows (+stage filter) | Deeper task semantics still evolving                    | Expand task lifecycle semantics and validations    |
| API       | Workflow listing/detail             |     ✅ | `WorkflowEndpoints.cs`                                                 | No create/update/version mgmt endpoints                 | Add admin workflow management API                  |
| API       | Provider listing/detail             |     ✅ | `ProviderEndpoints.cs`                                                 | No provider CRUD/secrets mgmt                           | Add provider config management                     |
| Runtime   | Queue runner/background dispatch    |     ✅ | `JobRunnerService.cs`                                                  | Polling + in-process limits only                        | Add durable queue / leasing                        |
| Runtime   | Workspace provisioning              |     ✅ | `WorkspaceProvisioner.cs` + tests                                      | Limited policy enforcement                              | Enforce workspace contract validations             |
| Runtime   | Docker execution                    |     🟡 | `DockerCliRuntime.cs` abstraction in place                             | No robust retry/backoff/telemetry envelopes             | Add retry policy + richer failure envelopes        |
| Runtime   | Local simulation mode               |     ✅ | `LocalSimRuntime.cs`                                                   | Sim path may diverge from real provider behavior        | Expand parity checks in tests                      |
| Workflows | Planning workflow definition        |     🟡 | `workflows/planning/workflow.yaml`                                     | Workflow engine not executing full stage/task semantics | Wire engine to persisted stages/tasks              |
| Providers | Claude Code provider image/scripts  |     🟡 | `providers/claude-code/*`                                              | Single provider only                                    | Add second provider adapter + compatibility tests  |
| Web       | Jobs list/detail/create/actions     |     ✅ | `app/jobs/*`, `components/jobs/*`                                      | API contract drift risks with future domain changes     | Add contract tests between web/api                 |
| Web       | Live log/event updates              |     ✅ | `use-job-sse`, logs/events panels                                      | Event parsing assumptions may be brittle                | Normalize SSE event schema                         |
| Web       | Workflows page                      |     ✅ | `components/workflows/workflows-view.tsx` live view                    | Management actions are still read-only                  | Add workflow create/update flows                   |
| Web       | Agents page                         |     ✅ | `components/agents/agents-view.tsx` live view                          | Advanced health/actions not yet implemented             | Add deeper runtime health/actions                  |
| Web       | Artifacts page                      |     ✅ | `components/artifacts/artifacts-view.tsx` + `/jobs/{id}/artifacts` API | Read-only listing only                                  | Add artifact download/open actions                 |
| Web       | Settings page                       |     ✅ | `components/settings/settings-view.tsx` live provider/system view      | No edit flows yet                                       | Add secure config edit flows                       |
| QA        | API tests                           |     ✅ | 55 passing tests                                                       | Coverage mostly API/domain                              | Keep expanding transition/edge-case coverage       |
| QA        | Web tests                           |     ✅ | Playwright E2E (`full-workflow.spec.ts`) with screenshots              | Coverage currently smoke-level                          | Add more scenario coverage and component tests     |
| Docs      | Architecture/spec corpus            |     ✅ | `docs/plans/*` extensive specs                                         | Plan docs ahead of implementation reality               | Add status docs and keep synced                    |

## Highest-Impact Gaps

1. **Initial commit history is too broad for ideal review/push hygiene.**
2. **Workspace/domain hardening is still partial (validation/git lifecycle).**
3. **Formatting gate fails (`pnpm format:check`) and blocks go-live.**
4. **Workflow/provider management is still mostly seed-based/read-only.**
