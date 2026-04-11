# Product Requirements Document (PRD)

## 1. Product Overview

### Product Name (Working)

OpenAgents

### Summary

A docker-native platform for orchestrating, supervising, and observing agentic CLI tools (Claude Code, OpenClaw, Codex, Gemini, Copilot, Ollama, etc.) through standardized workflows, with real-time dashboards, durable artifacts, and extensible provider integrations.

The platform enables single-agent and multi-agent (team) execution across reproducible environments using containers and devcontainers, while preserving all work outputs outside model context windows.

---

## 2. Problem Statement

Agentic CLI tools are powerful but fragmented:

- Each tool has different capabilities, logging formats, and behaviors
- Work is often lost in ephemeral context windows
- There is no standard orchestration model across tools
- Observability is limited or non-existent
- Multi-agent collaboration is ad hoc
- Reproducibility across environments is inconsistent
- Workflow reuse across providers is difficult

Teams lack a unified way to:

- Run structured workflows
- Observe agent progress in real time
- Persist artifacts and decisions
- Compare providers and models
- Coordinate multiple agents reliably

---

## 3. Goals and Objectives

### Primary Goals

1. Orchestrate agentic CLI workflows in containers
2. Provide real-time observability across jobs, agents, and workflows
3. Persist all important outputs (tasks, reports, mailbox, git, logs)
4. Enable provider-agnostic workflows with provider-specific adapters
5. Support reproducible environments via devcontainers and preloaded images
6. Enable multi-agent collaboration using a durable mailbox system
7. Standardize workflow stages, tasks, and iteration loops

### Secondary Goals

- Provide compatibility matrices across providers
- Enable experimentation and benchmarking across providers/models
- Support extensible plugins, skills, and workflows
- Prepare for enterprise features (RBAC, auditing, quotas)

### Non-Goals (v1)

- Perfect abstraction across all providers
- Exact billing accuracy across all models
- Distributed multi-host orchestration
- Enterprise-grade auth and permissions
- **MCP server / control-plane extension** — deferred to post-v1
- **Devcontainer support** — deferred to post-v1
- **Non-local auth** (API keys, RBAC, token-based access) — v1 is local/trusted only
- **Multiple providers** — v1 ships Claude Code only
- **WebSocket realtime transport** — v1 uses SSE only

---

## 4. User Personas

### 4.1 Platform Operator

- Manages orchestrator deployment
- Monitors jobs and system health
- Debugs failures

### 4.2 Workflow Author

- Creates workflows (stages, tasks, roles, prompts)
- Defines compatibility and behavior

### 4.3 Provider/Pack Author

- Adds support for new CLIs or models
- Implements adapters, parsers, and capabilities

### 4.4 End User

- Runs jobs
- Monitors progress
- Reviews outputs and reports

### 4.5 Team Lead / Reviewer

- Runs review workflows
- Compares outputs
- Validates results

---

## 5. Key Features

### 5.1 Job Orchestration

- Create, start, stop, retry, archive jobs
- Bind workflows to providers and models
- Container lifecycle management via Docker

### 5.2 Workflow Engine

- Stage-based execution
- Task-based progression
- Optional stages
- Dynamic task generation
- Gate-based completion

### 5.3 Agent Execution

- Single-agent workflows
- Multi-agent team workflows
- Role-based agent assignment
- Crew definitions

### 5.4 Iteration Control

- Global iteration limits
- Stage-level iteration loops
- Task-level iteration loops
- Workflow-defined iteration extensions

### 5.5 Dashboard

#### Global View

- Running Jobs
- Pending Jobs
- Finished Jobs
- Archived Jobs

#### Job View

- Parameters
- Stages and tasks
- Logs (raw and processed)
- Timeline
- Mailbox
- Git activity
- Metrics (tokens, models, cache)
- Reports

#### Agent View

- Logs and tool usage
- Mailbox
- Current stage/task
- Modified files

### 5.6 Mailbox System

- Agent-to-agent communication
- Persistent file-based messaging
- Inbox, drafts, outbox, sent, archive
- Notification injection into prompts

### 5.7 Artifact Tracking

- Token usage
- Model usage
- Cache usage
- Timeline events
- Git history
- Reports

### 5.8 Git Integration

- Track branches and worktrees
- Track commits and diffs
- Display live repository state

### 5.9 Devcontainer Integration

> **v1 Status: Deferred — devcontainer support is out of scope for v1.**

- Reproducible workspace environments
- Optional overlay on provider images
- Consistent tooling across agents

### 5.10 Extensibility

- Provider packs
- Workflow packs
- Skills
- Hooks
- Plugins
- Loadouts

---

## 6. Functional Requirements

### 6.1 Job Lifecycle

- User can create a job with workflow + provider + parameters
- System launches container(s)
- System tracks state transitions
- System persists results and artifacts

### 6.2 Workflow Execution

- Every job must have ≥1 stage
- Every job must have ≥1 task
- Tasks can be dynamically generated
- Stage completion depends on task completion

### 6.3 Iteration Handling

- System enforces global iteration limit
- System enforces stage/task limits
- System exposes iteration metrics in UI

### 6.4 Logging and Observability

- System captures raw container logs
- System parses logs into structured format
- System emits timeline events
- UI updates in real time

### 6.5 Mailbox

- Agents can send/receive messages
- Messages persist to filesystem
- System tracks read receipts

### 6.6 Git Tracking

- System detects commits and branch changes
- System displays git activity live

### 6.7 Reports

- Every job produces a report
- Reports include summary, stages, tasks, and artifacts

---

## 7. Non-Functional Requirements

### 7.1 Performance

- UI updates in near real-time (<2s latency target)
- Job startup within acceptable container spin-up time

### 7.2 Reliability

- Jobs survive transient failures when possible
- Supervisor loop prevents runaway execution

### 7.3 Scalability (v1 target)

- Support dozens of concurrent jobs on a single host

### 7.4 Security

- Docker socket treated as privileged boundary
- Secrets scoped per job
- Workspace isolation per job

### 7.5 Observability

- All actions logged
- Timeline events persisted
- Debuggable job history

---

## 8. Success Metrics

### Adoption Metrics

- Number of jobs executed
- Number of workflows created
- Number of provider integrations

### Reliability Metrics

- Job success rate
- Failure classification accuracy
- Retry success rate

### Performance Metrics

- Time to first output
- Time to job completion

### Observability Metrics

- % of jobs with complete artifact capture
- % of jobs with usable reports

### Developer Experience

- Time to add a new provider
- Time to add a new workflow

---

## 9. Risks and Mitigations

### Risk: Docker socket exposure

Mitigation:

- Clear documentation
- Optional hardened deployment modes later

### Risk: Provider inconsistency

Mitigation:

- Capability flags
- Compatibility matrix

### Risk: Log parsing complexity

Mitigation:

- Provider-specific parsers
- Fallback raw logs

### Risk: Runaway loops

Mitigation:

- Supervisor loop
- Iteration caps

### Risk: Lost context

Mitigation:

- TODO.md
- Mailbox
- Reports

---

## 10. Milestones

> See `IMPLEMENTATION-PLAN.md` for the detailed granular milestone breakdown (M0–M10). The phases below are product-level groupings. v1 covers phases M0–M5 of this list (M0–M6 in IMPLEMENTATION-PLAN granularity).

### M0: Foundations

- Repo structure
- Core schemas
- Basic orchestrator

### M1: Single-Agent Execution

- One provider
- One workflow
- Logs + report

### M2: Workflow Engine

- Stages and tasks
- Iteration handling

### M3: Provider Expansion

- Multiple providers
- Compatibility matrix

### M4: Multi-Agent Teams

- Mailbox system
- Crew execution

### M5: Metrics + Reporting

- Token/model tracking
- Rich reports

### M6: Hardening

- Stability improvements
- Security improvements

---

## 11. Open Questions

1. Should agent dashboards be standalone or proxied?
2. How strict should workflow contracts be?
3. How deep should provider abstraction go?
4. How will secrets be managed per provider?
5. Should workflows be versioned independently?

---

## 12. Summary

This product standardizes and operationalizes agentic CLI workflows.

It transforms loosely-coupled agent tools into a structured, observable, and extensible platform capable of supporting real development workflows, experimentation, and collaboration.

The core value is not execution, but orchestration, durability, and insight.
