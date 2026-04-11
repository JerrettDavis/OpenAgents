> **ARCHIVED — Background Reference Only**
> This document is the original ideation artifact. It is **not the canonical planning reference** and must not be used to drive implementation decisions. All authoritative specifications live in `docs/plans/`. Contradictions between this file and any other `docs/plans/` document are resolved in favour of the dedicated spec document.

---

# Agentic CLI Orchestration Platform

## 1. Vision

Build a docker-native orchestration platform for running, supervising, observing, and coordinating agentic CLI tools across multiple providers and local runtimes.

The platform will:

- Orchestrate contain([code.claude.com](https://code.claude.com/docs/en/devcontainer)) end to end
- Support multiple agentic CLIs and local runtimes
- Standardize workflows across providers where possible
- Expose live operational dashboards for orchestrator-level and agent-level visibility
- Provide durable artifacts, logs, reports, mailbox messages, timeline events, git telemetry, and model/token metrics
- Support both single-agent and multi-agent team workflows
- Integrate with devcontainers for consistent workspace bootstrap and reproducible environments
- Be extensible through plugins, hooks, skills, workflows, loadouts, and provider adapters

This repo is effectively an agent runtime platform, workflow engine, provider abstraction layer, and operational dashboard system.

---

## 2. Product Goals

### Primary goals

- Run agentic CLI jobs reliably inside containers
- Make agent work observable in real time
- Preserve all critical context and outputs outside the agent context window
- Support provider-agnostic workflows with provider-specific adaptations where needed
- Enable reproducible workspace setup through devcontainers and preloaded images
- Support parallel, sequential, adversarial, and team-based execution patterns
- Provide deterministic, inspectable workflow stages and tasks
- Capture durable artifacts for auditing, debugging, billing estimation, and reporting

### Secondary goals

- Enable future SaaS or self-hosted multi-user deployment
- Allow workflow packs and provider packs to be shipped independently
- Support enterprise controls later (RBAC, audit policies, retention, quotas, tenancy)
- Make it easy to add new CLIs, plugins, subagents, and models

### Non-goals for v1

- Full enterprise identity and permission model
- Full billing accuracy for every provider
- Universal parity of all provider capabilities
- Deep cloud-managed scheduling across multiple hosts
- Perfect abstraction over every CLI feature

---

## 3. Core Principles

1. Container first
   - Every orchestrated job runs in a containerized environment.

2. Workspace durability
   - Important work must land in the filesystem, git history, reports, TODO files, mailbox files, and event logs, not only in model context.

3. Provider portability
   - Workflows should be authored once and mapped to providers with the thinnest provider-specific layer possible.

4. Observable by default
   - Logs, turns, tools, timeline events, git changes, tasks, stages, and outcomes should be inspectable live.

5. Extensible without forking core
   - Workflows, provider adapters, skills, hooks, plugins, and loadouts should be additive.

6. Safe orchestration boundaries
   - The orchestrator supervises jobs and containers, but agent execution remains isolated per workspace.

7. Files as truth where practical
   - TODO.md, reports, mailbox items, structured artifacts, and workflow manifests should act as durable system contracts.

---

## 4. User Personas

### Platform operator

Runs the orchestrator, manages images, monitors jobs, debugs workflow failures, tunes runtime policies.

### Workflow author

Defines new workflows, stages, tasks, compatibility rules, prompts, skills, setup/teardown logic, reports, and completion gates.

### Agent pack author

Adds support for a new CLI or provider by shipping a provider image, hooks, skills, plugins, parsers, and capability metadata.

### End user

Creates and monitors jobs, views live progress, adjusts workflow options, downloads reports/artifacts, and inspects results.

### Team lead / reviewer

Runs review workflows, compares outputs, tracks iteration loops, inspects commits, and validates outcomes.

---

## 5. Top-Level Capabilities

### 5.1 Job orchestration

- Create jobs from workflow definitions
- Bind jobs to a provider image and model
- Launch containerized execution
- Track state transitions and lifecycle
- Restart, resume, stop, archive, or clone jobs

### 5.2 Workflow engine

- Stage-based workflows
- Task-based progression
- Gate checks and completion criteria
- Optional stages
- Provider-specific overrides
- Dynamic model reassignment by workflow logic where allowed

### 5.3 Agent supervision

- Root supervisor loop
- Stage-level external loop
- CLI/plugin-level task loop where available
- Timeout, liveness, and runaway detection
- Hard-stop classification and outcome normalization

### 5.4 Dashboarding

- Global orchestrator dashboard
- Per-job detail pages
- Per-agent dashboard pages
- Real-time logs, timeline, git activity, tasks, stages, mailbox, artifacts, and metrics

### 5.5 Mailbox system

- Agent-to-agent communication
- Agent-to-user communication
- Agent-to-orchestrator communication
- Drafts, inbox, outbox, sent, archive semantics
- Read receipt and notification injection hooks

### 5.6 Artifact collection

- Token and model usage
- Timeline events
- Reports and summaries
- Structured job metadata
- Git telemetry
- Parsed conversation logs
- Raw container logs
- Provider-specific metadata

### 5.7 Extensibility

- Provider packs
- Workflow packs
- Skill packs
- Plugin packs
- Hook packs
- Loadouts
- Role and crew definitions

---

## 6. System Context

The system consists of:

- An **Orchestrator** service container
- One or more **Agent Job** containers
- Optional **MCP Server** container(s)
- Shared or mapped **workspace storage**
- A **dashboard UI** served by orchestrator and optionally by agents
- A **metadata/event store**
- A **streaming/log ingestion path**
- Docker socket access for orchestration control

The orchestrator creates and supervises agent containers. Agent containers execute workflows inside mapped workspaces. Agents emit logs, events, artifacts, mailbox activity, and status updates. The orchestrator normalizes and presents them.

---

## 7. Proposed Architecture

### 7.1 Major subsystems

#### A. Orchestrator Core

Responsibilities:

- Job creation and lifecycle control
- Docker interactions
- Runtime scheduling and supervision
- Workflow resolution
- Provider image selection
- State transitions
- Artifact indexing
- Live event fanout to dashboard

#### B. Workflow Engine

Responsibilities:

- Load workflow manifests
- Expand stages and tasks
- Apply compatibility rules
- Enforce completion gates
- Handle stage/task iteration policies
- Resolve role and crew requirements

#### C. Provider Adapter Layer

Responsibilities:

- Abstract different CLI tools
- Standardize environment conventions
- Normalize logs, turns, tool calls, and status
- Define provider capabilities and compatibility metadata

#### D. Agent Runtime Contract

Responsibilities:

- Define standard filesystem layout
- Define standard environment variables
- Define stage/task/report/mailbox conventions
- Define control files and event emission contracts

#### E. Dashboard/API Layer

Responsibilities:

- Serve live UI
- Expose REST/streaming APIs
- Job detail views
- Agent detail views
- Artifact browsing
- Workflow catalog
- Compatibility matrix views

#### F. Storage Layer

Responsibilities:

- Persist metadata, events, artifacts, reports, logs, and state snapshots
- Allow archive/export/import behaviors

#### G. Git Telemetry Layer

Responsibilities:

- Track branch/worktree activity
- Track commits and diffs metadata
- Expose current branch and history
- Observe active repo state over time

#### H. Mailbox Service Layer

Responsibilities:

- Durable file-backed messaging conventions
- Event generation for new mail/read receipts
- Optional UI interaction layer

---

## 8. Container and Image Strategy

### 8.1 Standard CLI-less images

#### 1. Orchestrator

Contains:

- Backend API
- Dashboard frontend
- Docker control integration
- Event ingestion and normalization
- Job storage/indexing
- Workflow registry loading
- Report aggregation

Needs:

- Docker socket access
- Access to persistent metadata/artifact storage
- Access to shared workspaces or mounted workspace roots

#### 2. Agent Base

Contains:

- Shared runtime contract implementation
- Supervisor scripts
- Stage loop scripts
- Standard filesystem layout
- Event/log emitters
- Report and task parsers
- Mailbox support
- Git instrumentation

#### 3. MCP Server

Contains:

- Standard control endpoints/tools for agents and orchestrator
- Monitoring and control functions
- Messaging hooks
- Optional provider coordination endpoints

#### 4. Preloaded Agent

Built on Agent Base and includes common developer tooling such as:

- pyenv
- python
- nvm
- node
- ripgrep
- playwright
- curl
- wget
- rust
- dotnet
- pwsh
- jq
- git and common repo tooling

This is the practical default image for many workflows.

### 8.2 Provider images

Provider images inherit from Agent Base or Preloaded Agent depending on need.

Examples:

- OpenClaw
- Opencode
- Claude Code
- Copilot
- Codex
- Gemini
- Ollama-backed image(s)

Each provider image should declare:

- Supported workflow capabilities
- Supported loop/plugin mechanisms
- Supported log parsing strategies
- Supported mailbox integration depth
- Supported token/model metrics fidelity
- Auth expectations
- Required setup and secrets
- Compatibility matrix entries

---

## 9. Devcontainer Integration Strategy

Devcontainers should be a first-class workspace bootstrap mechanism, not a hidden implementation detail.

### Goals

- Reproducible workspace setup
- Consistent developer and agent tooling
- Easier onboarding and local debugging
- Alignment with supported agent environments

### Integration model

1. The repo provides reference devcontainer definitions for local development.
2. Workflows may optionally point to project devcontainer metadata when running jobs.
3. Agent job creation can choose one of:
   - Native provider image only
   - Provider image + project devcontainer configuration overlays
   - Provider image operating against a workspace that was prebuilt from a devcontainer

4. The orchestrator should normalize how devcontainer settings influence runtime environment.

### Devcontainer-aware concerns

- Volume mounts
- Tool parity
- Network/firewall rules
- User IDs and file permissions
- Post-create/bootstrap hooks
- Secrets handling
- Workspace folder mapping
- Feature injection

### Recommendation

Create an internal devcontainer adapter layer that converts project devcontainer configuration into a normalized runtime contract rather than directly relying on editor-specific assumptions.

---

## 10. Job Domain Model

### 10.1 Job aggregate

Fields include:

- JobId
- Title
- Description
- WorkflowType
- WorkflowVersion
- ProviderType
- PrimaryModel
- CurrentState
- Outcome
- CreatedAt
- StartedAt
- FinishedAt
- Duration
- SessionAge
- SourceGitBranch
- WorkingGitBranch
- TargetGitBranch
- OpenPr
- WorkspacePhysicalPath
- WorkspaceContainerPath
- ContainerName
- ExitCode
- FinalOutputSummaryPath
- ReportPath
- CurrentStageId
- CurrentTaskId
- ActiveBranch
- ConnectionStatus
- ArchivedAt

### 10.2 Job parameters

- CLI Type
- Agent definition reference
- Workflow parameters
- PR link
- Topic list
- Resource list
- review/comment flags
- repo/workspace binding
- model overrides
- stage enable/disable flags
- loadouts
- compatibility enforcement settings

### 10.3 Job artifacts

- Token usage snapshots
- Model usage snapshots
- Cache reads/writes
- Billing estimates
- Cache break estimates
- Container logs
- Parsed logs
- Timeline events
- Commit metadata
- Worktree metadata
- Reports
- Generated markdown artifacts
- Uploaded/downloaded workflow artifacts

### 10.4 Stage model

- StageId
- Name
- Description
- State
- IsOptional
- StartedAt
- FinishedAt
- Duration
- MaxIterations
- CurrentIteration
- GateConditions
- AssignedRoles
- AssignedAgents

### 10.5 Task model

- TaskId
- StageId
- Title
- Description
- Status
- StartedAt
- FinishedAt
- Duration
- MaxIterations
- CurrentIteration
- Source (seeded, generated, imported)
- LinkedFiles
- OutputSummaryPath

### 10.6 Agent instance model

- AgentInstanceId
- JobId
- Name
- Description
- RoleSet
- ProviderType
- Model
- ContainerName
- State
- ConnectionStatus
- MailboxPath
- DashboardUrl
- CurrentStageId
- CurrentTaskId

### 10.7 Mail model

- MessageId
- CorrelationId
- Subject
- From
- To
- Status
- Path
- CreatedAt
- ReadAt
- ArchivedAt
- MessageType

---

## 11. Workflow Model

### 11.1 Workflow definition should include

- Metadata
- Human-readable description
- Version
- Category
- Compatibility matrix
- Default provider/model mappings
- Optional stages
- Required roles
- Required loadouts
- Required skills/hooks/plugins
- Environment variables and defaults
- Setup scripts
- Teardown scripts
- Report generation rules
- Completion rules
- Failure classification rules
- Dynamic model reassignment policy

### 11.2 Workflow categories

Initial categories:

- SDLC
- Planning
- Research
- General
- Peer Review
  - Review
  - Revise/Correct
  - Auto loop

### 11.3 Stage requirements

Every workflow has at least one stage.
Examples:

- `default`
- `work`
- `planning`
- `implementation`
- `review`

### 11.4 Task requirements

Every workflow has at least one task at initialization.
Fallback example:

- `[] Create Tasks`

### 11.5 Workflow execution styles

- Single agent
- Sequential handoff
- Parallel crew
- Adversarial review
- Planner-worker-reviewer loop
- Team mailbox collaboration

---

## 12. Roles, Crews, and Team Model

### Standard roles

- Researcher
- Planner
- Security Reviewer
- Infrastructure Reviewer
- General Reviewer
- Technical Document Writer
- User Document Writer
- Debugger

Additional likely default roles:

- Implementer
- Tester
- Release Coordinator
- Prompt Engineer
- Maintainer

### Crew model

A crew is a named composition of role assignments and optional agent definitions.

A crew member may:

- Hold multiple roles
- Use a specific provider/model override
- Be optional
- Be reused across stages
- Have unique loadouts and skills

### Team mode

Team mode runs multiple agent containers that collaborate using mailbox and shared artifact conventions.

---

## 13. Iteration and Looping Model

### Native iteration variables

- `iterations`
- `iterations__stage`
- `iterations__task`

### Workflow-defined variables

- `iterations__planning`
- `iterations__working`
- `iterations__review`
- `iterations__debug`
- and any nested `iterations__*`

### Execution model

#### Root supervisor loop

- Enforced by base container or orchestrator policy
- Detects fatal errors, lack of progress, retry candidates, and hard stop conditions
- Caps total attempts according to `iterations`

#### Stage loop

- Runs externally around a stage
- Re-enters stage work until gate conditions are met or max stage iterations are reached

#### Task loop

- Preferably runs inside provider-specific plugin/hook systems when supported
- Used for local task retries and refinements

### Metrics exposure

UI should show:

- Configured maximums
- Current counts
- Estimated remaining room
- Final loop counts by scope

---

## 14. Mailbox System Design

### Filesystem contract

Each agent has:

- `~/mailbox`
- symlinked to `/workspace/.mailbox`

Structure:

- `inbox/`
- `drafts/`
- `outbox/`
- `sent/`
- `archived/`

### Behavioral model

- New outbound messages are written to `outbox`
- Delivery moves them to recipient `inbox`
- Recipient read moves sender copy to `sent` semantics or marks receipt
- Recipient archives when processed
- Agents are encouraged to write durable notes to drafts continuously

### Prompt injection conventions

Agent pre-send hooks may inject notifications such as:

- `!!YOU GOT MAIL ...!!`
- `!!MESSAGE READ ...!!`

### Why mailbox matters

It preserves coordination and key decisions outside model context windows and provides a durable collaboration fabric.

---

## 15. Logging, Telemetry, and Artifact Model

### 15.1 Raw logs

- Container stdout/stderr
- Provider CLI logs
- Plugin logs
- Orchestrator action logs

### 15.2 Processed logs

Normalized conversation-like views of:

- Inputs
- Outputs
- Turns
- Tool uses
- System notices
- Mailbox events
- Stage/task transitions

### 15.3 Timeline events

Every material action becomes a timestamped event, for example:

- Job created
- Container launched
- Stage entered
- Task generated
- Prompt sent
- Tool used
- Commit created
- PR opened
- Mail sent
- Failure classified
- Stage completed
- Job archived

### 15.4 Git telemetry

- Current branch
- All branches
- Worktrees
- Commit stream
- Modified files
- Current diff stats
- Merge/PR metadata when available

### 15.5 Report artifacts

Every job must emit a report even on failure.
Potential sections:

- Summary
- Outcome
- What was attempted
- Stage-by-stage details
- Task-by-task details
- Notable decisions
- Mailbox highlights
- Git changes
- Risks/issues
- Next steps
- Token/model usage
- Billing estimate

---

## 16. Dashboard Design

### 16.1 Global dashboard

Sections:

- Running Jobs
- Pending Jobs
- Finished Jobs
- Archived Jobs

Views:

- Card and table views
- Filters by provider, workflow, state, repo, model, outcome
- Search by title, branch, agent, workspace, container, report text

### 16.2 Job detail page

Should show:

- Parameters
- State and outcome
- Stages and tasks
- Live logs
- Parsed conversation history
- Timeline
- Mailbox
- Git activity
- Models/tokens/cache metrics
- Iteration counters
- Reports and artifacts
- Workspace/container metadata

### 16.3 Agent detail page

Should show:

- Agent metadata
- Current task/stage
- Live logs
- Mailbox
- Tool uses
- Modified files
- Git status
- Models used and model history
- Internal subagent activity when available

### 16.4 Real-time transport

Prefer server-sent events or websockets for live updates.

---

## 17. State Model

### Job states

- Pending
- Connecting
- Running
- Completed
- Error
- Archived

### Detailed connection status

- Connecting
- Connected
- Flakey
- Failing
- Failed
- Disconnected

### Outcomes

- Completed Successfully
- Completed Abnormally
- Completed with Errors
- Partially Completed
- Incomplete
- Failed
- Invalid
- Not Started

Need a clear distinction between transport/runtime state and business outcome.

---

## 18. Provider Abstraction Model

Each provider pack should implement a contract such as:

- Launch strategy
- Authentication strategy
- Model selection semantics
- Prompt/command submission mechanism
- Turn parsing
- Tool-use parsing
- Token usage extraction
- Cache usage extraction
- Task loop support
- Mailbox integration support
- Report helper support
- Dynamic model switching support

### Capability flags example

- supports_task_plugin_loop
- supports_structured_tool_logs
- supports_model_override
- supports_subagents
- supports_mailbox_notifications
- supports_token_metrics
- supports_cache_metrics
- supports_agent_dashboard

---

## 19. Filesystem and Workspace Contract

Inside container workspace:

- `/workspace/<project>`
- `/workspace/<project>/TODO.md`
- `/workspace/<project>/.mailbox/`
- `/workspace/<project>/.agent-orch/`
  - `job.json`
  - `workflow.json`
  - `state.json`
  - `events/`
  - `reports/`
  - `artifacts/`
  - `metrics/`
  - `logs/`
  - `tasks/`
  - `stages/`
  - `mailbox-index/`

The repo should formalize this layout so scripts and dashboards can depend on it.

---

## 20. Storage Strategy

### v1 recommendation

Use a simple but durable architecture:

- Relational DB for metadata and state (PostgreSQL or SQLite for local dev)
- Object/file storage for raw artifacts and logs
- In-memory pub/sub or lightweight event bus for streaming updates

### Why

This keeps the model understandable while allowing future scale-up.

### Persisted entities

- Jobs
- Stages
- Tasks
- Agents
- Events
- Reports
- Mail index
- Model usage snapshots
- Git snapshots
- Artifact references

---

## 21. API Surface

Likely API groups:

- Jobs
- Workflows
- Providers
- Agents
- Artifacts
- Reports
- Mailbox
- Git
- Metrics
- Events/Streams
- Control actions (start, stop, retry, archive, resume)

---

## 22. Security and Risk Notes

### Important risk

The orchestrator requires docker socket access, which is effectively highly privileged and should be treated as sensitive.

### Additional risk areas

- Provider credentials in containers
- Workspace secret exposure
- Malicious repo contents
- Overly permissive devcontainer features
- Mailbox injection abuse
- Cross-job artifact leakage
- Branch/PR side effects

### Guardrails for v1

- Clear trust boundaries
- Per-job workspace isolation
- Scoped env/secret injection
- Read/write path restrictions where practical
- Explicit job-level capability toggles
- Audit trail for control actions
- Document that devcontainers improve consistency and isolation but are not a complete security boundary

---

## 23. Repository Structure Proposal

```text
/agent-orch
  /apps
    /orchestrator-api
    /orchestrator-web
    /agent-dashboard
    /mcp-server
  /images
    /base-agent
    /preloaded-agent
    /orchestrator
    /mcp-server
    /providers
      /claude-code
      /codex
      /copilot
      /gemini
      /openclaw
      /opencode
      /ollama
  /packages
    /core
    /contracts
    /workflow-engine
    /provider-abstractions
    /mailbox
    /git-telemetry
    /artifact-indexer
    /eventing
    /metrics
    /compatibility
    /loadouts
  /workflows
    /sdlc
    /planning
    /research
    /peer-review
    /general
  /providers
    /claude-code-pack
    /codex-pack
    /copilot-pack
    /gemini-pack
    /openclaw-pack
    /opencode-pack
    /ollama-pack
  /skills
  /hooks
  /plugins
  /agents
    /roles
    /crews
    /subagents
  /schemas
  /scripts
  /docs
  /examples
    /sample-jobs
    /sample-workspaces
    /sample-reports
  docker-compose.yml
  README.md
```

---

## 24. Key Contracts to Define Early

These need to be written before heavy implementation:

1. Job manifest schema
2. Workflow manifest schema
3. Provider capability schema
4. Agent role/crew schema
5. Event schema
6. Timeline schema
7. Report schema
8. Mailbox file format and lifecycle rules
9. TODO.md standard structure
10. Workspace directory contract
11. Token/model/cache metrics schema
12. Compatibility matrix schema
13. Stage/task gate semantics

---

## 25. TODO.md Contract Proposal

Each workspace should maintain a standard TODO file that is both human- and script-readable.

Recommended sections:

- Job summary
- Workflow info
- Active stage
- Stage checklist
- Task checklist
- Risks/blockers
- Decisions
- Links/resources
- Completion notes

This becomes the portable progress interface across providers.

---

## 26. Initial Workflow Packs to Ship

### 1. General Work

Minimal workflow for ad hoc tasks.

### 2. Planning

Research, clarify, design, and produce structured planning artifacts.

### 3. Research

Collect evidence, synthesize findings, produce report.

### 4. Peer Review

Review only, revise/correct, or auto-loop review modes.

### 5. SDLC

Planning, analysis, design, implementation, testing & integration, maintenance.

---

## 27. Compatibility Matrix Design

Every workflow should ship with a matrix that answers:

- Which providers are supported
- Which providers are first-class
- Which features degrade gracefully
- Which setup steps are required
- Which stages differ by provider
- Which metrics are available per provider

This should be machine-readable and rendered in UI.

---

## 28. Recommended Technical Direction for v1

### Backend

A strongly typed backend is a good fit because the system is contract-heavy and stateful.

### Frontend

A reactive UI with strong real-time support.

### Runtime control

Docker SDK / socket integration with a clean container-control abstraction.

### Storage

Start simple but structured.

### Eventing

Event sourcing is optional. Event logging is required.

---

## 29. Suggested Milestone Plan

### Milestone 0. Foundations

- Repo skeleton
- Image skeletons
- Core schemas
- Workspace contract
- Minimal orchestrator service
- Minimal dashboard shell

### Milestone 1. Single-agent execution

- Launch one provider container
- Run one simple workflow
- Show live logs and state
- Persist report and artifacts

### Milestone 2. Stage/task engine

- Workflow manifests
- Stage/task state tracking
- TODO parsing/updating
- Iteration counters
- Timeline events

### Milestone 3. Provider packs

- Claude Code
- OpenClaw
- Codex or Gemini
- Compatibility matrix rendering

### Milestone 4. Mailbox and team mode

- Mailbox durable contract
- Multi-agent job orchestration
- Crew definitions
- Agent-to-agent coordination

### Milestone 5. Git telemetry and review workflows

- Branch/worktree tracking
- PR review workflow
- Review report generation

### Milestone 6. Metrics and reporting depth

- Token/model usage normalization
- Cache metrics where available
- Billing estimates
- Rich report exports

### Milestone 7. Hardening

- Retry/failure handling improvements
- Auth and access controls
- Retention/archive controls
- Better secrets handling

---

## 30. Open Design Questions

1. Will orchestrator and UI be one deployable or separate apps?
2. Do agent dashboards run inside agent containers, or are they views proxied by orchestrator?
3. How much provider-specific parsing is required to normalize logs well enough?
4. How will credentials be provisioned per provider in local and hosted modes?
5. Will workflow packs be versioned inside the repo or independently shippable?
6. How strict should TODO.md parsing be?
7. Will the mailbox file format be markdown, frontmatter markdown, JSON, or mixed?
8. How much job control is delegated to MCP versus orchestrator-native APIs?
9. How will devcontainer features map into runtime image layering?
10. What is the first provider workflow combination to make truly polished?

---

## 31. Recommended Next Documents

To continue this properly, the next files should be:

1. `PRD.md`
2. `SYSTEM-ARCHITECTURE.md`
3. `DOMAIN-MODEL.md`
4. `WORKFLOW-SPEC.md`
5. `PROVIDER-CONTRACT.md`
6. `WORKSPACE-CONTRACT.md`
7. `MAILBOX-SPEC.md`
8. `EVENT-SCHEMAS.md`
9. `DASHBOARD-UX.md`
10. `IMPLEMENTATION-PLAN.md`
11. `REPO-STRUCTURE.md`
12. `ADR-001-docker-socket-and-runtime-boundaries.md`
13. `ADR-002-devcontainer-integration-strategy.md`
14. `ADR-003-workflow-and-provider-abstraction.md`

---

## 32. Practical Recommendation for First Slice

The first truly valuable vertical slice is:

- One orchestrator container
- One preloaded agent provider image
- One simple workflow (`general` or `planning`)
- One real workspace repo
- Live logs
- Standard TODO.md
- Report output
- Job detail page
- Minimal token/model metrics if available

That slice will validate the runtime model, the workspace contract, the dashboard shape, and the artifact pipeline before multi-agent complexity arrives.

---

## 33. Summary

This repository is not just a set of Docker images. It is a structured execution platform for agentic CLI workflows.

The hardest part is not launching containers. The hardest part is defining durable contracts between:

- workflows
- providers
- agents
- workspaces
- artifacts
- telemetry
- humans
- future automation

If those contracts are clear, the system can grow cleanly. If those contracts are fuzzy, every provider addition and workflow will become bespoke.

So the first implementation priority should be strong schemas, strong filesystem conventions, and one excellent vertical slice.
