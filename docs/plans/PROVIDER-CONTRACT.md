# PROVIDER CONTRACT

## 1. Overview

The Provider Contract defines how a specific agentic CLI/runtime (Claude Code, OpenClaw, Codex, Gemini, Copilot, Ollama, etc.) integrates with OpenAgents.

A **Provider** is responsible for executing agent work inside a container while conforming to a standardized contract so the orchestrator can:

- Launch and control execution
- Observe logs, turns, and tool usage
- Extract metrics (tokens, models, cache)
- Coordinate stages and tasks
- Support mailbox and artifact conventions

This contract is the critical abstraction boundary that prevents provider-specific logic from leaking into workflows and the orchestrator.

---

## 2. Design Principles

1. Strict Boundary
   - Providers adapt to OpenAgents, not the other way around

2. Capability-Driven
   - Providers declare what they support explicitly

3. Progressive Enhancement
   - Basic providers work with minimal features
   - Advanced providers unlock richer telemetry and control

4. Fail Transparently
   - If a feature is unsupported, degrade gracefully but visibly

5. No Hidden Magic
   - All behavior must be observable and traceable

---

## 3. Provider Definition

Each provider is packaged as a **Provider Pack** consisting of:

- Docker image
- Capability metadata
- Launch contract
- Parsing contract
- Metrics extraction logic
- Optional plugins/hooks/skills

---

## 4. ProviderDefinition Schema

```yaml
provider:
  id: string
  name: string
  version: string

  image:
    ref: string
    base: base-agent | preloaded-agent

  capabilities:
    supports_task_loop: bool
    supports_structured_logs: bool
    supports_token_metrics: bool
    supports_cache_metrics: bool
    supports_dynamic_model_switching: bool
    supports_mailbox_notifications: bool
    supports_subagents: bool
    supports_agent_dashboard: bool

  auth:
    strategy: env | file | interactive
    required_env: []

  launch:
    entrypoint: string
    args: []

  parsing:
    log_format: text | json | hybrid

  metrics:
    extraction_strategy: regex | structured | none
```

---

## 5. Provider Responsibilities

A provider must:

1. Start successfully within the container
2. Accept instructions from the workflow
3. Emit logs to stdout/stderr
4. Operate within the workspace contract
5. Respect environment variables
6. Exit cleanly with an exit code

Optional (but recommended):

- Emit structured logs
- Provide token usage metrics
- Support iteration loops via plugins
- Support mailbox awareness

---

## 6. Execution Contract

### Input to Provider

The provider receives:

- Workspace mount (`/workspace/...`)
- Environment variables
- Workflow parameters
- Task instructions (via CLI or files)
- Mailbox directory

### Output from Provider

The provider must produce:

- Logs (stdout/stderr)
- File outputs in workspace
- Exit code

Optional:

- Structured logs
- Metrics output
- Tool usage events

---

## 7. Environment Contract

### Required Environment Variables

```bash
JOB_ID=
WORKFLOW_ID=
STAGE_ID=
TASK_ID=
PROVIDER_ID=
PRIMARY_MODEL=
ITERATIONS=
ITERATIONS__STAGE=
ITERATIONS__TASK=
WORKSPACE_PATH=/workspace/project
MAILBOX_PATH=/workspace/.mailbox
```

### Optional Environment Variables

- Custom iteration variables (`ITERATIONS__*`)
- Provider-specific configs
- Secrets

---

## 8. Workspace Contract

Providers must:

- Read/write within `/workspace`
- Respect:
  - TODO.md
  - `.mailbox/`
  - `.agent-orch/`

They must NOT:

- Assume exclusive ownership of workspace
- Break directory structure

---

## 9. Log and Parsing Contract

### Raw Logs

Providers must emit logs to stdout/stderr.

### Structured Logs (Preferred)

```json
{
  "type": "turn",
  "role": "assistant",
  "content": "...",
  "model": "..."
}
```

### Log Types

- prompt
- response
- tool_use
- system
- error

---

## 10. Metrics Contract

### Token Usage

If supported:

```json
{
  "input_tokens": 123,
  "output_tokens": 456
}
```

### Cache Metrics

Optional:

```json
{
  "cache_reads": 100,
  "cache_writes": 50
}
```

### Billing

Providers do NOT calculate billing. They expose raw data.

---

## 11. Iteration Support

### Levels

- Job-level: orchestrator
- Stage-level: base container
- Task-level: provider (if supported)

### Plugin Requirement

Providers that support task loops should expose:

- Retry hooks
- Iteration counters
- Exit/retry signals

---

## 12. Mailbox Integration

### Basic Support

- Read files from `/workspace/.mailbox/inbox`
- Write to `/workspace/.mailbox/outbox`

### Notification Polling (v1)

**v1 decision**: Providers must check `.agent-orch/mailbox-index/pending-notifications.md` at each execution boundary (before/after each stage and task). This is boundary-based polling — **not** arbitrary stdin injection. Providers that support mid-turn stdin injection may implement it as an advanced capability post-v1.

### Advanced Support (post-v1)

- Inject mailbox events into prompts mid-turn via stdin
- Emit read receipts automatically

---

## 13. Provider Lifecycle

1. Container starts
2. Provider initializes
3. Workflow instructions executed
4. Logs emitted continuously
5. Files updated in workspace
6. Exit code returned

---

## 14. Failure Handling

Providers must:

- Exit non-zero on failure
- Emit error logs

Common failure types:

- Auth failure (401)
- Rate limit
- CLI crash
- Invalid input

---

## 15. Compatibility Requirements

Providers must declare compatibility with workflows.

If incompatible:

- Job must fail early

---

## 16. Security Requirements

**v1 posture: local/trusted environment only.** There is no API key or credential check between the orchestrator and provider adapters in v1. Auth strategy defaults to `env` — API credentials are passed as environment variables.

Providers must:

- Respect environment isolation
- Avoid leaking secrets to logs
- Avoid modifying host environment

---

## 17. Testing Requirements

Each provider must be testable via:

- Smoke test workflow
- Token metrics validation (if supported)
- Log parsing validation

---

## 18. v1 Provider

**Claude Code is the first and only provider for v1.** All other providers below are reference examples for post-v1 implementation.

### Claude Code (v1 — first provider)

- Strong structured logs
- Supports plugins/hooks
- Good token visibility
- Auth via `ANTHROPIC_API_KEY` environment variable
- `supports_mailbox_notifications`: boundary-based polling

### OpenClaw (post-v1 reference)

- Plugin-driven loops
- Rich tool interactions

### Ollama (post-v1 reference)

- Local model execution
- Limited metrics

---

## 19. Provider Packaging

Directory structure:

```
/providers/<provider-name>/
  provider.yaml
  Dockerfile
  scripts/
  parsers/
  plugins/
```

---

## 20. Summary

The Provider Contract ensures:

- Consistency across diverse CLIs
- Clean separation of concerns
- Extensibility without chaos

It is the key to making OpenAgents scale across providers without becoming unmaintainable.
