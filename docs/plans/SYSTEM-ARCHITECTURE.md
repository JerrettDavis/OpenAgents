# SYSTEM ARCHITECTURE

## 1. Overview

OpenAgents is a container-first orchestration platform for agentic CLI tools. The system is composed of a central orchestrator, multiple agent runtime containers, optional control-plane services (MCP), and a unified dashboard/API layer.

The architecture is designed around strong contracts between workflows, providers, agents, and workspaces, with durability and observability as first-class concerns.

---

## 2. High-Level Architecture

```
                ┌──────────────────────────────┐
                │        Dashboard UI          │
                │  (Web + Agent Dashboards)    │
                └──────────────┬───────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Orchestrator API   │
                    │  (Core Control Plane)│
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼───────┐     ┌────────▼────────┐    ┌────────▼────────┐
│ Workflow Engine│     │ Provider Layer │    │ Event Pipeline  │
└───────┬───────┘     └────────┬────────┘    └────────┬────────┘
        │                      │                      │
        │                      │                      │
        │            ┌─────────▼─────────┐            │
        │            │ Docker Controller │            │
        │            └─────────┬─────────┘            │
        │                      │                      │
        │        ┌─────────────▼─────────────┐        │
        │        │ Agent Containers (N)      │◄───────┘
        │        │ (Provider-specific)       │
        │        └─────────────┬─────────────┘
        │                      │
        │          ┌───────────▼───────────┐
        │          │ Workspace + Artifacts │
        │          └───────────┬───────────┘
        │                      │
        │        ┌─────────────▼─────────────┐
        │        │ Storage + Metadata Store  │
        │        └───────────────────────────┘
```

---

## 3. Core Components

### 3.1 Orchestrator API (Control Plane)

Responsibilities:

- Job lifecycle management
- Workflow resolution and execution control
- Container orchestration via Docker socket
- State transitions and persistence
- Event emission and aggregation
- API surface for UI and external control

Key characteristics:

- Stateless API layer with backing persistence
- Authoritative source of job state
- Central coordinator for all jobs

---

### 3.2 Workflow Engine

Responsibilities:

- Load and validate workflow definitions
- Expand stages and tasks
- Enforce stage/task contracts
- Evaluate gate conditions
- Drive progression between stages
- Apply compatibility rules

Execution model:

- Stage-driven orchestration
- Task-driven execution within stages
- External loop control for retries and completion

---

### 3.3 Provider Adapter Layer

Responsibilities:

- Normalize CLI-specific behavior
- Provide unified execution contract
- Parse logs, tool usage, and outputs
- Extract token/model/cache metrics where possible

Each provider implements:

- Launch strategy
- Input/output contract
- Log parsing rules
- Capability flags

---

### 3.4 Docker Controller

Responsibilities:

- Start/stop containers
- Attach to logs
- Manage volumes and workspace mounts
- Monitor container health

Notes:

- Uses Docker socket (privileged)
- Abstracted behind internal interface

---

### 3.5 Agent Containers (Runtime Plane)

Each job runs in one or more agent containers.

Responsibilities:

- Execute CLI commands
- Implement agent runtime contract
- Maintain workspace state
- Emit logs and events
- Manage mailbox
- Produce artifacts and reports

Types:

- Base agent
- Preloaded agent
- Provider-specific agent images

---

### 3.6 MCP Server (Optional Control Plane Extension)

> **v1 Status: Deferred — MCP support is out of scope for v1.** This section describes the intended post-v1 architecture only.

Responsibilities:

- Provide tool APIs for agents
- Enable agent-to-orchestrator communication
- Provide monitoring and control endpoints
- Facilitate external integrations

---

### 3.7 Event Pipeline

Responsibilities:

- Collect events from orchestrator and agents
- Normalize event structure
- Stream updates to UI
- Persist timeline events

**v1 implementation**: Agent containers write JSON event files to `.agent-orch/events/`. The orchestrator watches that directory, ingests new files, appends them to the event-log table (CRUD), and broadcasts each event to connected UI clients via SSE. Full event sourcing with projection rebuilds is post-v1.

Realtime transport:

- **Server-Sent Events (SSE) — locked for v1**
- WebSockets — post-v1

---

### 3.8 Storage Layer

Responsibilities:

- Persist job metadata
- Store events and logs
- Store reports and artifacts

Recommended structure:

- Relational DB (jobs, tasks, stages, agents)
- File/object storage (logs, reports, artifacts)

---

### 3.9 Workspace Layer

Responsibilities:

- Provide working directory for agents
- Persist files across container lifecycle
- Maintain git repository state
- Store TODO.md, mailbox, and artifacts

Mounted into containers as:

- `/workspace/<project>`

---

### 3.10 Dashboard UI

Responsibilities:

- Display system state
- Visualize jobs, stages, tasks
- Show logs and artifacts
- Provide control actions

Sub-views:

- Global dashboard
- Job detail view
- Agent detail view

---

## 4. Data Flow

### 4.1 Job Execution Flow

1. User creates job via UI/API
2. Orchestrator validates request
3. Workflow Engine expands workflow
4. Orchestrator provisions container(s)
5. Agent container starts execution
6. Logs/events streamed to orchestrator
7. Orchestrator updates state and UI
8. Artifacts persisted
9. Job completes → report generated

---

### 4.2 Event Flow

```
Agent Container → Event Emitter → Orchestrator → Event Pipeline → UI
                                              → Storage
```

---

### 4.3 Git Telemetry Flow

```
Workspace FS → Git Monitor → Event Pipeline → UI + Storage
```

---

## 5. Execution Model

### 5.1 Single-Agent Execution

- One container
- Sequential workflow stages
- Local task iteration

### 5.2 Multi-Agent Execution

- Multiple containers
- Coordinated via mailbox
- Parallel or sequential execution

### 5.3 Supervisor Model

#### Root Supervisor

- Monitors job health
- Enforces global iteration limits
- Detects fatal errors

#### Stage Loop

- Ensures stage completion
- Re-enters stage if needed

#### Task Loop

- Provider-level retry mechanism

---

## 6. Contracts and Boundaries

### 6.1 Orchestrator ↔ Agent Contract

- Environment variables
- Workspace structure
- Event emission format
- Log output expectations
- Mailbox conventions

### 6.2 Workflow ↔ Provider Contract

- Capability compatibility
- Required features
- Fallback behaviors

### 6.3 Workspace Contract

- Standard directory structure
- TODO.md format
- Mailbox layout
- Artifact directories

---

## 7. Scaling Considerations (Future)

### Horizontal scaling

- Multiple orchestrator instances
- Shared storage backend

### Job distribution

- Remote execution nodes
- Queue-based scheduling

### Event scaling

- Message broker (Kafka, etc.)

---

## 8. Failure Handling

Types of failures:

- Container crash
- CLI failure
- Auth failure (401, etc.)
- Workflow misconfiguration
- Infinite loops

Handling strategy:

- Retry within iteration limits
- Classify failure
- Surface in UI
- Include in report

---

## 9. Security Model (v1)

**v1 posture: local/trusted environment only.** The orchestrator and all agent containers run on the same Docker host. There is no authentication layer, no API keys, and no token-based access control in v1. Users with access to the host have full access to the orchestrator API.

Trust boundaries:

- Orchestrator (trusted)
- Agent containers (semi-trusted)
- Workspaces (user-controlled)

Key concerns:

- Docker socket exposure
- Secret leakage
- Malicious repo code

Mitigations:

- Scoped environment variables
- Workspace isolation
- Clear documentation of risks

---

## 10. Deployment Model

### Local (v1 primary)

- Docker Compose
- Single host
- Shared volumes

### Future

- Kubernetes deployment
- Multi-node execution
- Hosted SaaS version

---

## 11. Observability

### Logs

- Raw container logs
- Parsed agent logs

### Metrics

- Job duration
- Stage/task duration
- Token usage
- Model usage

### Events

- Timeline events
- State transitions

---

## 12. Summary

The OpenAgents architecture separates concerns into clear layers:

- Control Plane (Orchestrator)
- Execution Plane (Agent Containers)
- Data Plane (Workspaces + Storage)
- Integration Plane (Providers + MCP)

The system emphasizes:

- Strong contracts
- Observability
- Extensibility
- Reproducibility

This structure enables incremental growth from a single-node local system to a distributed orchestration platform.
