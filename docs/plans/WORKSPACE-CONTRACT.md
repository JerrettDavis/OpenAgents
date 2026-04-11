# WORKSPACE CONTRACT

## 1. Overview

The Workspace Contract defines the **filesystem structure, conventions, and guarantees** that all agent containers, workflows, and providers must follow.

The workspace is the **durable source of truth** for agent execution. Anything important must exist in the workspace, not just in model context.

This contract ensures:

- Reproducibility
- Observability
- Recoverability
- Provider portability

---

## 2. Core Principles

1. Filesystem is truth
   - If it matters, it must exist as a file

2. Deterministic structure
   - All agents and providers rely on the same layout

3. Non-destructive behavior
   - Agents must not arbitrarily delete or restructure core directories

4. Append and evolve
   - Data should be appended or versioned, not overwritten blindly

5. Machine + human readable
   - Everything should be parseable but still readable

---

## 3. Root Structure

All workspaces must follow this structure:

```
/workspace/<project>/
  TODO.md
  .mailbox/
  .agent-orch/
  .git/
  <project files>
```

---

## 4. Core Directories

### 4.1 Project Root

Contains:

- User/project files
- Generated code
- Documentation

Agents operate primarily here.

---

### 4.2 TODO.md

The central execution contract between the orchestrator, agents, and the workspace.

#### Requirements

- Must exist at project root before agent execution starts
- Must be updated by agents continuously as work progresses
- Must reflect current stages and tasks
- Must be machine-parseable by the orchestrator's TODO parser

---

#### TODO.md Grammar (v1 Formal Specification)

The orchestrator's parser uses the following rules. Agents **must** follow this format exactly for machine parsing to work.

##### File Structure

```
# <Job Title or "TODO">

## Metadata
job_id: <job-id>
workflow: <workflow-id>
stage: <active-stage-id>

## Stages
- [<stage-status>] <stage-id>: <Stage Display Name>
...

## Tasks
- [<task-status>] <task-id>: <Task Title>
  > <optional one-line description>
...

## Decisions
- <timestamp>: <decision text>

## Notes
- <free text>
```

##### Stage Status Tokens

| Token       | Meaning                               |
| ----------- | ------------------------------------- |
| ` ` (space) | `NotStarted` — stage has not begun    |
| `-`         | `Active` — stage is currently running |
| `x`         | `Done` — stage completed              |
| `!`         | `Blocked` — stage cannot proceed      |
| `s`         | `Skipped` — stage was skipped         |

Example: `- [-] planning: Planning Stage`

##### Task Status Tokens

| Token       | Meaning                                               |
| ----------- | ----------------------------------------------------- |
| ` ` (space) | `NotStarted`                                          |
| `-`         | `Active` — task is in progress                        |
| `x`         | `Done` — task completed successfully                  |
| `!`         | `Blocked` — task is blocked (append reason after `:`) |
| `~`         | `Cancelled`                                           |

Example: `- [-] task-001: Define requirements`

##### Parsing Rules

1. A line starting with `- [` followed by a single status token and `]` is a parseable entry.
2. `stage-id` and `task-id` must be lowercase, hyphen-separated, no spaces.
3. The `:` separator between id and title is required.
4. The `## Metadata` block is key-value pairs, one per line, no YAML delimiters.
5. Everything under `## Decisions` and `## Notes` is free text — not machine-parsed.
6. Unknown status tokens cause the parser to treat the line as `NotStarted`.

##### Minimal Valid Example

```markdown
# TODO

## Metadata

job_id: job_abc123
workflow: planning
stage: plan

## Stages

- [x] setup: Environment Setup
- [-] plan: Planning
- [ ] implement: Implementation

## Tasks

- [x] task-001: Initialize workspace
- [-] task-002: Define requirements
- [ ] task-003: Create design document

## Decisions

- 2026-01-01T12:00:00Z: Chose PostgreSQL for storage layer.

## Notes

- Waiting on stakeholder input for task-003.
```

---

### 4.3 Mailbox Directory

```
.mailbox/
  inbox/
  drafts/
  outbox/
  sent/
  archived/
```

#### Rules

- Agents must read from `inbox`
- Agents write outgoing messages to `outbox`
- System moves messages to `sent` on delivery
- Agents archive processed messages
- Agents should persist important thoughts in `drafts`

---

### 4.4 .agent-orch Directory

Internal system directory.

```
.agent-orch/
  job.json
  workflow.json
  state.json
  events/
  logs/
  artifacts/
  reports/
  metrics/
  stages/
  tasks/
  mailbox-index/
```

#### Purpose

- Structured metadata
- Durable execution state
- Event tracking
- Artifact indexing

#### Rules

- Agents may read but should not arbitrarily mutate system files unless instructed

---

## 5. Subdirectories

### 5.1 events/

- Append-only JSON event files written by agent containers
- Each file is one event envelope (see EVENT-SCHEMAS.md)
- Filenames: `<iso-timestamp>-<event-type>-<event-id>.json`
- **v1 mechanism**: The orchestrator uses a filesystem watcher on this directory. Each new file triggers ingestion → DB append → SSE broadcast to clients. Files are never deleted by the orchestrator.

### 5.2 logs/

- Raw logs
- Parsed logs

### 5.3 artifacts/

- Generated outputs
- Reports
- Files

### 5.4 reports/

- Structured markdown reports

### 5.5 metrics/

- Token usage
- Model usage

### 5.6 stages/ and tasks/

- Serialized runtime state snapshots

---

## 6. File Naming Conventions

- Use lowercase with hyphens
- Include timestamps when appropriate
- Avoid overwriting critical files

Examples:

- `report-final-2026-01-01.md`
- `task-001-summary.md`

---

## 7. Git Contract

### Requirements

- Workspace must be a git repository
- Agents must commit changes regularly
- Use conventional commits where possible

### Branch Strategy

- Source branch: starting point
- Working branch: active work
- Target branch: merge/PR target

### Rules

- Do not force-push unless explicitly allowed
- Avoid destructive git operations

---

## 8. Artifact Rules

Artifacts must:

- Be written to `.agent-orch/artifacts/`
- Be referenced in reports or tasks
- Be immutable after creation where possible

---

## 9. Logging Rules

- All provider logs → stdout/stderr
- System logs → `.agent-orch/logs/`
- Important summaries → artifacts or reports

---

## 10. State Files

### job.json

- Static job metadata

### workflow.json

- Workflow definition snapshot

### state.json

- Current execution state

---

## 11. Devcontainer Integration

> **v1 Status: Deferred — devcontainer support is out of scope for v1.** Agents run in standard provider images. The workspace may contain a `.devcontainer/` directory from the source repository, but the orchestrator does not read or apply it in v1.

If devcontainer is present (future use):

```
.devcontainer/
  devcontainer.json
  Dockerfile
```

### Rules

- Agents must respect devcontainer environment
- Must not override without explicit instruction

---

## 12. Multi-Agent Coordination

### Shared Workspace

- Multiple agents may operate on same workspace

### Rules

- Use mailbox for coordination
- Avoid race conditions on files
- Prefer append operations

---

## 13. Safety Rules

Agents must NOT:

- Delete `.agent-orch/`
- Delete `.mailbox/`
- Rewrite TODO.md destructively
- Remove git history

---

## 14. Recovery Guarantees

The workspace must allow:

- Restarting a job
- Replaying tasks
- Reconstructing state from files

---

## 15. Validation Rules

Workspace is valid if:

- Required directories exist
- TODO.md exists
- Git repo initialized
- `.agent-orch` structure present

---

## 16. Summary

The Workspace Contract is the backbone of OpenAgents.

It ensures:

- Durability of work
- Interoperability across providers
- Observability for users
- Recoverability after failures

Without this contract, agent execution would be ephemeral and unreliable.

With it, OpenAgents becomes a deterministic, inspectable system.
