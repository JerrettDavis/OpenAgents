# Architecture

## Core flow

1. User creates a job from UI
2. API persists job + execution plan (stages/tasks)
3. Job runner provisions workspace and starts container runtime
4. Runtime emits events/logs to persistence + SSE
5. UI renders status, timeline, logs, artifacts

## Key subsystems

- **API layer**: endpoints for jobs, workflows, providers, artifacts
- **Domain layer**: aggregates and lifecycle state
- **Runtime layer**: Docker/local runtime execution
- **UI layer**: configuration + monitoring + control panels
