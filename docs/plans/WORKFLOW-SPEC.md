# WORKFLOW SPECIFICATION

## 1. Overview

Workflows are the core abstraction that define _how work gets done_ in OpenAgents.

A workflow is a versioned, declarative, extensible specification that:

- Defines stages and tasks
- Assigns roles and agents
- Declares provider compatibility
- Defines iteration, gating, and completion rules
- Produces structured outputs and reports

Workflows must be portable across providers, with provider-specific overrides only where necessary.

---

## 2. Design Principles

1. Definition vs Execution
   - Workflows are immutable definitions
   - Jobs are runtime executions of workflows

2. Provider-Agnostic Core
   - Define once, adapt per provider

3. Explicit Contracts
   - No implicit behavior, everything declared

4. Durable Outputs
   - Work must persist to filesystem (TODO.md, reports, mailbox)

5. Extensible
   - Allow plugins, hooks, scripts, and overrides

---

## 3. Workflow Structure

### Top-Level Schema

```yaml
workflow:
  id: string
  name: string
  version: string
  category: string
  description: string

  defaults:
    provider: string
    model: string
    loadouts: []
    roles: []

  compatibility:
    providers: []

  stages: []

  policies:
    iteration: {}
    failure: {}
    completion: {}

  artifacts:
    report: {}

  hooks:
    setup: []
    teardown: []
```

---

## 4. Stage Specification

Each workflow must define ≥1 stage.

### Stage Schema

```yaml
- id: string
  name: string
  description: string
  optional: bool
  order: int

  roles: []

  model_override: string?

  iteration:
    max: int

  gates:
    - type: string
      condition: string

  tasks:
    strategy: seed | dynamic | hybrid
    seed:
      - title: string
        description: string
```

### Stage Rules

- Stages execute in order unless explicitly parallelized
- Optional stages may be skipped at runtime
- Stage completes only when all gates pass

---

## 5. Task Specification

Tasks represent atomic units of work.

### Task Schema (Seeded)

```yaml
- title: string
  description: string
  roles: []
  output:
    path: string
    format: markdown | json | file
```

### Task Rules

- Every workflow must initialize at least one task
- Tasks may generate additional tasks dynamically
- Tasks must map to TODO.md entries

---

## 6. Iteration Model

### Supported Fields

```yaml
iteration:
  job: int
  stage: int
  task: int
  custom:
    planning: int
    review: int
```

### Behavior

- `job` enforced by orchestrator supervisor
- `stage` enforced by stage loop
- `task` enforced by provider/plugin loop
- `custom` tracked but not enforced by core

---

## 7. Roles and Crews

### Role Assignment

```yaml
roles:
  - researcher
  - planner
  - reviewer
```

### Crew Definition

```yaml
crew:
  name: default
  members:
    - roles: [planner]
      model: claude-3
    - roles: [implementer]
      model: codex
```

### Rules

- Roles map to agent instances
- Multiple roles may map to one agent
- Multiple agents may share roles

---

## 8. Provider Compatibility

### Schema

```yaml
compatibility:
  providers:
    - id: claude-code
      support: first_class
    - id: codex
      support: partial
```

### Support Levels

- first_class
- supported
- partial
- experimental
- unsupported

### Rules

- Must explicitly declare compatibility
- Unsupported providers must fail early

---

## 9. Model Selection

### Default

Defined at workflow root

### Overrides

- Stage-level override
- Agent-level override
- Runtime override

### Dynamic Selection

Workflows may allow agents to change models:

```yaml
policies:
  model_selection:
    allow_dynamic: true
```

---

## 10. Artifacts and Reports

### Report Definition

```yaml
artifacts:
  report:
    required: true
    format: markdown
    sections:
      - summary
      - stages
      - tasks
      - results
```

### Rules

- Every workflow must produce a report
- Reports must be durable artifacts

---

## 11. Hooks and Scripts

### Setup/Teardown

```yaml
hooks:
  setup:
    - script: setup-env.sh
  teardown:
    - script: cleanup.sh
```

### Usage

- Run inside container
- Can modify environment or workspace

---

## 12. Mailbox Integration

### Policy

```yaml
policies:
  mailbox:
    enabled: true
    notify_on_receive: true
```

### Behavior

- Agents communicate via filesystem mailbox
- Important decisions persisted

---

## 13. Failure and Completion

### Failure Policy

```yaml
policies:
  failure:
    retry_on:
      - transient
    fail_on:
      - auth_error
```

### Completion Policy

```yaml
policies:
  completion:
    requires_all_tasks: true
```

---

## 14. TODO.md Contract

Workflows must align with TODO.md structure.

### Requirements

- Tasks must map to TODO items
- Status must be trackable
- Must be machine-parseable

---

## 15. Workflow Packaging

Each workflow is distributed as:

```
/workflows/<workflow-name>/
  workflow.yaml
  prompts/
  scripts/
  templates/
  compatibility.json
```

---

## 16. Versioning

- Semantic versioning recommended
- Breaking changes require version bump
- Jobs must bind to a specific version

---

## 17. Validation Rules

- Must have ≥1 stage
- Must have ≥1 task seed
- Must declare compatibility
- Must define completion rules
- Must define report behavior

---

## 18. Execution Lifecycle

1. Workflow selected
2. Parameters applied
3. Workflow expanded to runtime model
4. Containers launched
5. Stages executed sequentially or in parallel
6. Tasks executed and updated
7. Artifacts generated
8. Report compiled
9. Job completed

---

## 19. Example (Simplified)

```yaml
workflow:
  id: planning
  version: 1.0.0

  defaults:
    provider: claude-code

  stages:
    - id: plan
      tasks:
        strategy: seed
        seed:
          - title: Define requirements
          - title: Create plan
```

---

## 20. Summary

The workflow spec defines how work is structured, executed, and completed in OpenAgents.

It provides:

- A portable definition format
- A consistent execution model
- Extensibility across providers
- Durability across runs

Workflows are the contract between human intent and agent execution.
