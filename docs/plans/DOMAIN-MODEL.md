# DOMAIN MODEL

## 1. Overview

The OpenAgents domain model defines the core entities, value objects, relationships, lifecycle transitions, and invariants required to orchestrate agentic CLI workflows in a durable, observable, and extensible way.

The domain is centered around the execution of **jobs**. A job binds a workflow, one or more agents, one or more workspaces, a provider/runtime strategy, and a set of execution parameters into a single orchestrated unit of work.

The model must support:

- Single-agent and multi-agent workflows
- Provider-specific execution with shared orchestration contracts
- Durable stage/task progression
- Iteration and retry semantics
- Real-time operational visibility
- Report and artifact generation
- Mailbox-driven collaboration
- Git-aware workspace execution
- Optional devcontainer-aware runtime setup

---

## 2. Domain Boundaries

### In scope

- Job orchestration
- Workflow definition and execution state
- Agent runtime assignments
- Stages, tasks, loops, and outcomes
- Mailbox communication
- Artifacts, reports, logs, metrics, and events
- Workspace and git execution context
- Provider compatibility and runtime capabilities

### Out of scope (for this model)

- Billing engine exactness
- Enterprise org/user/RBAC model
- Cross-host distributed scheduling internals
- External SaaS tenant modeling
- Full provider credential vault design

---

## 3. Aggregate Overview

Primary aggregates:

1. **Job**
2. **WorkflowDefinition**
3. **Workspace**
4. **AgentInstance**
5. **Mailbox**
6. **ProviderDefinition**
7. **Report**

Supporting entities and value objects hang off these aggregates.

---

## 4. Core Aggregate: Job

## 4.1 Purpose

A Job represents one orchestrated execution request. It is the primary runtime aggregate and the central unit of coordination, observability, and lifecycle management.

A Job answers:

- What is being run?
- Against which workspace/repo?
- Using which workflow?
- Using which provider(s), images, and models?
- With which agents, stages, and tasks?
- In what current state and outcome?

---

## 4.2 Job Entity

### Identity

- `JobId`

### Core Properties

- `Title`
- `Description`
- `State`
- `Outcome`
- `ConnectionStatus`
- `CreatedAtUtc`
- `QueuedAtUtc`
- `StartedAtUtc`
- `FinishedAtUtc`
- `ArchivedAtUtc`
- `Duration`
- `SessionAge`

### Execution Context

- `WorkflowDefinitionId`
- `WorkflowVersion`
- `WorkflowCategory`
- `PrimaryProviderId`
- `PrimaryModel`
- `SourceGitBranch`
- `WorkingGitBranch`
- `TargetGitBranch`
- `ShouldOpenPullRequest`
- `PullRequestUrl`
- `ContainerStrategy`
- `DevcontainerMode` _(post-v1 — devcontainer support deferred)_

### Runtime Context

- `CurrentStageId`
- `CurrentTaskId`
- `ActiveWorkspaceId`
- `ActiveBranch`
- `ExitCode`
- `FinalOutputSummaryArtifactId`
- `FinalReportId`

### Relationships

- Has one or more `JobStageInstance`
- Has one or more `JobTaskInstance`
- Has one or more `AgentInstance`
- Has one or more `WorkspaceBinding`
- Has many `JobEvent`
- Has many `Artifact`
- Has many `MetricSnapshot`
- Has many `TimelineEntry`
- Has many `GitActivity`
- Has zero or more `JobIterationCounter`

---

## 4.3 Job Invariants

- A job must reference exactly one workflow definition/version at creation time.
- A job must have at least one stage.
- A job must have at least one task at initialization.
- A job must have at least one provider execution path.
- A job must have at least one workspace binding.
- A job must produce a report, even on failure.
- A terminal state must always be accompanied by an outcome classification.

---

## 4.4 Job State Machine

> **v1 Storage note**: Job state is maintained via CRUD updates to the `jobs` table. Each state transition is also appended to the event log (as a `job.*` event file in `.agent-orch/events/`). State is read directly from the `jobs` table — it is not derived by replaying events in v1.

### Runtime State Transition Table

| From           | To             | Trigger                                | Notes                            |
| -------------- | -------------- | -------------------------------------- | -------------------------------- |
| _(none)_       | `Pending`      | Job created via API                    | Initial state                    |
| `Pending`      | `Queued`       | Accepted for execution                 | Placed in work queue             |
| `Queued`       | `Provisioning` | Container launch starts                | Docker container creation begins |
| `Provisioning` | `Connecting`   | Container started                      | Waiting for agent to respond     |
| `Connecting`   | `Running`      | Agent heartbeat / first log line       | Active execution                 |
| `Running`      | `Paused`       | User pause action                      | Agent halted                     |
| `Paused`       | `Running`      | User resume action                     | Execution resumes                |
| `Running`      | `Stopping`     | User stop action or terminal condition | Graceful shutdown                |
| `Stopping`     | `Completed`    | Container exits 0                      | Terminal — success               |
| `Stopping`     | `Error`        | Container exits non-zero               | Terminal — failure               |
| `Running`      | `Error`        | Unrecoverable failure                  | Terminal — failure               |
| `Completed`    | `Archived`     | User archive action                    | Terminal — archived              |
| `Error`        | `Archived`     | User archive action                    | Terminal — archived              |
| `Connecting`   | `Error`        | Connection timeout                     | Terminal — failed to start       |

### Runtime State Values

- `Pending`
- `Queued`
- `Provisioning`
- `Connecting`
- `Running`
- `Paused`
- `Stopping`
- `Completed`
- `Error`
- `Archived`

### Business Outcome

Set at terminal state. Only one outcome per job.

| Outcome                 | Meaning                                 |
| ----------------------- | --------------------------------------- |
| `NotStarted`            | Default before execution                |
| `CompletedSuccessfully` | All stages/tasks finished as expected   |
| `CompletedAbnormally`   | Finished but with unexpected conditions |
| `CompletedWithErrors`   | Partially succeeded with errors         |
| `PartiallyCompleted`    | Some stages/tasks done, stopped early   |
| `Incomplete`            | Did not reach a completion state        |
| `Failed`                | Hard failure                            |
| `Invalid`               | Job was invalid at creation             |

### Connection Status

Tracks agent container connectivity independently of job state.

- `Unknown` → `Connecting` → `Connected`
- `Connected` may degrade to `Flakey` → `Failing` → `Failed`
- `Disconnected` — container stopped or unreachable

The model deliberately separates runtime state, connection/transport state, and business outcome.

---

## 4.5 Job Parameters

Job parameters are captured as a structured value object rather than loose configuration.

### JobParameters

- `CliType`
- `WorkflowType`
- `AgentDefinitionRefs`
- `CrewDefinitionRef`
- `RoleAssignments`
- `WorkflowParameters`
- `TopicList`
- `ResourceList`
- `ReviewOptions`
- `ModelOverrides`
- `ProviderOverrides`
- `LoadoutRefs`
- `StageEnablement`
- `SetupScriptRefs`
- `TeardownScriptRefs`
- `EnvironmentOverrides`

### Notes

Some values should remain strongly typed. Others can be backed by extensible JSON with validation against workflow/provider schemas.

---

## 5. WorkflowDefinition Aggregate

## 5.1 Purpose

Defines the reusable template for how work is executed.

A workflow definition is not runtime state. It is design-time metadata, contracts, compatibility information, stage/task defaults, and execution policies.

---

## 5.2 WorkflowDefinition Entity

### Identity

- `WorkflowDefinitionId`
- `Name`
- `Slug`
- `Version`

### Metadata

- `DisplayName`
- `Description`
- `Category`
- `Tags`
- `IsEnabled`
- `IsExperimental`

### Execution Defaults

- `DefaultPrimaryProviderId`
- `DefaultPrimaryModel`
- `DefaultLoadouts`
- `DefaultRoleAssignments`
- `DefaultCrewDefinitionRef`

### Structure

- `StageDefinitions`
- `TaskSeedDefinitions`
- `GateDefinitions`
- `ReportDefinition`
- `CompatibilityMatrix`

### Runtime Policies

- `DynamicModelSelectionPolicy`
- `FailureHandlingPolicy`
- `IterationPolicy`
- `ArtifactPolicy`
- `MailboxPolicy`
- `GitPolicy`

### External Hooks

- `SetupScriptRefs`
- `TeardownScriptRefs`
- `RequiredSkills`
- `RequiredPlugins`
- `RequiredHooks`

---

## 5.3 WorkflowDefinition Invariants

- Must contain at least one stage definition.
- Must define at least one initial task strategy.
- Must define completion semantics.
- Must declare compatibility requirements for every supported provider.

---

## 6. Stage and Task Runtime Model

The runtime model must distinguish between **definitions** and **instances**.

- `StageDefinition` is reusable workflow metadata.
- `JobStageInstance` is runtime execution state for a specific job.
- `TaskDefinition` or seed definition describes how tasks begin.
- `JobTaskInstance` is the concrete task tracked for a specific job.

---

## 6.1 StageDefinition

- `StageDefinitionId`
- `Name`
- `Slug`
- `Description`
- `Order`
- `IsOptional`
- `GateDefinitions`
- `RequiredRoles`
- `AllowedProviders`
- `DefaultModelOverride`
- `IterationPolicy`
- `SetupScriptRefs`
- `TeardownScriptRefs`

---

## 6.2 JobStageInstance

- `JobStageInstanceId`
- `JobId`
- `StageDefinitionId`
- `Name`
- `State`
- `Outcome`
- `Order`
- `StartedAtUtc`
- `FinishedAtUtc`
- `Duration`
- `IsSkipped`
- `IsOptional`
- `CurrentIteration`
- `MaxIterations`
- `AssignedAgentIds`
- `AssignedRoleBindings`
- `GateEvaluationSnapshot`

### Stage States

| State        | Meaning                                     |
| ------------ | ------------------------------------------- |
| `NotStarted` | Waiting for prior stage to complete         |
| `Ready`      | Dependencies met, can start                 |
| `Running`    | Active execution                            |
| `Waiting`    | Waiting on gate condition or external input |
| `Blocked`    | Cannot proceed — human intervention needed  |
| `Completed`  | All gates passed                            |
| `Skipped`    | Optional stage, not executed                |
| `Failed`     | Stage failed terminally                     |

### Stage State Transitions

| From         | To          | Trigger                                             |
| ------------ | ----------- | --------------------------------------------------- |
| `NotStarted` | `Ready`     | Prior stage completed (or first stage on job start) |
| `Ready`      | `Running`   | Orchestrator starts stage execution                 |
| `Running`    | `Waiting`   | Gate evaluation pending                             |
| `Waiting`    | `Running`   | Gate condition satisfied                            |
| `Waiting`    | `Blocked`   | Max wait exceeded                                   |
| `Running`    | `Completed` | All gates pass                                      |
| `Running`    | `Failed`    | Unrecoverable error                                 |
| `NotStarted` | `Skipped`   | Stage is optional and explicitly skipped            |
| `Blocked`    | `Running`   | Human override / force-continue                     |

### Invariants

- A stage instance belongs to exactly one job.
- A job stage instance must map to exactly one stage definition.
- A completed stage must satisfy gate requirements or be explicitly force-completed/overridden.

---

## 6.3 TaskDefinition / TaskSeedDefinition

- `TaskSeedDefinitionId`
- `Title`
- `Description`
- `StageDefinitionId`
- `GenerationStrategy`
- `DefaultAssigneeRoles`
- `DefaultOutputLocations`
- `CompletionRules`

---

## 6.4 JobTaskInstance

- `JobTaskInstanceId`
- `JobId`
- `JobStageInstanceId`
- `ParentTaskId`
- `Title`
- `Description`
- `State`
- `Outcome`
- `Source`
- `StartedAtUtc`
- `FinishedAtUtc`
- `Duration`
- `CurrentIteration`
- `MaxIterations`
- `AssignedAgentIds`
- `AssignedRoleBindings`
- `TodoAddress`
- `OutputSummaryArtifactId`
- `LinkedArtifactIds`
- `LinkedFilePaths`

### Task States

| State        | Meaning                                  |
| ------------ | ---------------------------------------- |
| `NotStarted` | Not yet assigned or started              |
| `Ready`      | Assigned and ready to execute            |
| `Running`    | Agent is actively working on it          |
| `Waiting`    | Waiting for input, dependency, or review |
| `Blocked`    | Cannot proceed                           |
| `Completed`  | Done — outcome recorded                  |
| `Failed`     | Terminal failure                         |
| `Cancelled`  | Explicitly cancelled                     |

### Task State Transitions

| From         | To          | Trigger                              |
| ------------ | ----------- | ------------------------------------ |
| `NotStarted` | `Ready`     | Agent assigned and stage running     |
| `Ready`      | `Running`   | Agent begins task                    |
| `Running`    | `Waiting`   | Awaiting review, dependency, or gate |
| `Waiting`    | `Running`   | Unblocked                            |
| `Running`    | `Completed` | Completion rules satisfied           |
| `Running`    | `Failed`    | Unrecoverable error                  |
| `Running`    | `Blocked`   | Agent cannot proceed                 |
| `Blocked`    | `Running`   | Human override                       |
| `Ready`      | `Cancelled` | Explicit cancellation                |
| `NotStarted` | `Cancelled` | Job cancelled before task started    |

### Task Source

- `Seeded`
- `Generated`
- `Imported`
- `Recovered`

### Invariants

- A task belongs to exactly one job.
- A task belongs to exactly one stage instance.
- Every job has at least one task at initialization.
- A task may create child tasks if the workflow allows hierarchical expansion.

---

## 7. AgentInstance Aggregate

## 7.1 Purpose

Represents a concrete runtime agent participating in a job.

An AgentInstance is not merely a provider container. It is the runtime embodiment of a role-bearing, model-bound worker with mailbox, logs, metrics, and state.

---

## 7.2 AgentInstance Entity

### Identity

- `AgentInstanceId`

### Core Properties

- `JobId`
- `Name`
- `Description`
- `State`
- `ConnectionStatus`
- `StartedAtUtc`
- `FinishedAtUtc`

### Runtime Properties

- `ProviderDefinitionId`
- `ImageRef`
- `ContainerName`
- `ContainerId`
- `PrimaryModel`
- `CurrentModel`
- `DashboardEndpoint`
- `MailboxId`
- `WorkspaceBindingId`

### Behavioral Properties

- `RoleBindings`
- `LoadoutRefs`
- `SkillRefs`
- `PluginRefs`
- `HookRefs`
- `SubagentRefs`

### Progress Properties

- `CurrentStageId`
- `CurrentTaskId`
- `LastHeartbeatAtUtc`
- `LastActivityAtUtc`

### Agent States

| State          | Meaning                           |
| -------------- | --------------------------------- |
| `Provisioning` | Container being created           |
| `Idle`         | Container running, no active task |
| `Running`      | Actively executing a task         |
| `Waiting`      | Waiting on input or dependency    |
| `Blocked`      | Cannot proceed                    |
| `Disconnected` | Container unreachable             |
| `Completed`    | Finished all assigned work        |
| `Failed`       | Terminal failure                  |

### Agent State Transitions

| From           | To             | Trigger                                     |
| -------------- | -------------- | ------------------------------------------- |
| `Provisioning` | `Idle`         | Container starts successfully               |
| `Idle`         | `Running`      | Task assigned and execution begins          |
| `Running`      | `Waiting`      | Awaiting mailbox, review, or external input |
| `Waiting`      | `Running`      | Unblocked                                   |
| `Running`      | `Idle`         | Task completed, no next task yet            |
| `Idle`         | `Completed`    | No more tasks, workflow done                |
| `Running`      | `Failed`       | Unrecoverable error                         |
| `Running`      | `Disconnected` | Container crash or network loss             |
| `Disconnected` | `Failed`       | Reconnect timeout exceeded                  |
| `Provisioning` | `Failed`       | Container failed to start                   |

---

## 7.3 AgentInstance Invariants

- An agent instance belongs to exactly one job.
- An agent instance must bind to exactly one provider definition.
- An agent instance must bind to exactly one mailbox.
- An agent instance must bind to at least one workspace binding.
- An agent may hold multiple roles.

---

## 8. Roles, Crews, and Assignments

## 8.1 RoleDefinition

Represents a reusable role such as:

- Researcher
- Planner
- Security Reviewer
- Infrastructure Reviewer
- General Reviewer
- Technical Document Writer
- User Document Writer
- Debugger
- Implementer
- Tester

### RoleDefinition Fields

- `RoleDefinitionId`
- `Name`
- `Slug`
- `Description`
- `DefaultSkills`
- `DefaultLoadouts`
- `DefaultPolicies`

---

## 8.2 CrewDefinition

A reusable team template.

### CrewDefinition Fields

- `CrewDefinitionId`
- `Name`
- `Slug`
- `Description`
- `CrewMembers`
- `DefaultCommunicationPolicy`
- `DefaultMailboxPolicy`

### CrewMemberDefinition

- `RoleRefs`
- `SuggestedProviderId`
- `SuggestedModel`
- `SuggestedLoadouts`
- `IsOptional`
- `ConcurrencyGroup`

---

## 8.3 RoleBinding

A runtime assignment of one or more roles to an agent, stage, or task.

### RoleBinding Fields

- `RoleBindingId`
- `RoleDefinitionId`
- `AgentInstanceId`
- `JobId`
- `StageId`
- `TaskId`
- `AssignedAtUtc`
- `ReleasedAtUtc`

---

## 9. Workspace Aggregate

## 9.1 Purpose

Represents the execution context on disk for agent work.

A workspace is where:

- the git repository lives
- the TODO contract lives
- the mailbox symlink lives
- reports, logs, metrics, and artifacts are written

---

## 9.2 Workspace Entity

- `WorkspaceId`
- `Name`
- `PhysicalPath`
- `ContainerPath`
- `RepositoryRoot`
- `DevcontainerRef`
- `IsBareRepository`
- `CreatedAtUtc`
- `LastObservedAtUtc`

### WorkspaceBinding

Links a job or agent to a workspace.

Fields:

- `WorkspaceBindingId`
- `WorkspaceId`
- `JobId`
- `AgentInstanceId`
- `BindingType`
- `MountedReadOnly`
- `SourceGitBranch`
- `WorkingGitBranch`
- `TargetGitBranch`
- `ActiveBranch`

### BindingType

- `Primary`
- `Secondary`
- `Shared`
- `ReadOnlyReference`
- `Scratch`

---

## 9.3 Workspace Invariants

- A job must have at least one workspace binding.
- A primary agent must have access to a primary workspace binding.
- The workspace contract directories must exist or be provisioned.

---

## 10. Git Domain Model

Git activity is operationally important enough to model explicitly.

### GitSnapshot

- `GitSnapshotId`
- `WorkspaceId`
- `ObservedAtUtc`
- `ActiveBranch`
- `BranchList`
- `WorktreeList`
- `ModifiedFiles`
- `UntrackedFiles`
- `AheadBy`
- `BehindBy`
- `HeadCommitSha`

### GitCommitRecord

- `GitCommitRecordId`
- `WorkspaceId`
- `CommitSha`
- `Author`
- `AuthoredAtUtc`
- `Message`
- `ParentCommitShas`
- `BranchRefs`
- `ConventionalCommitType`

### GitActivity

- `GitActivityId`
- `JobId`
- `WorkspaceId`
- `ObservedAtUtc`
- `ActivityType`
- `Summary`
- `Metadata`

### GitActivityType

- `BranchCreated`
- `BranchSwitched`
- `CommitCreated`
- `WorktreeCreated`
- `MergeRequested`
- `PullRequestOpened`
- `DiffObserved`

---

## 11. Mailbox Aggregate

## 11.1 Purpose

Provides a durable collaboration mechanism that survives context window loss.

---

## 11.2 Mailbox Entity

- `MailboxId`
- `OwnerType`
- `OwnerId`
- `RootPath`
- `InboxPath`
- `DraftsPath`
- `OutboxPath`
- `SentPath`
- `ArchivedPath`
- `NotificationPolicy`

### OwnerType

- `Agent`
- `User`
- `Orchestrator`
- `Workflow`
- `System`

---

## 11.3 MailMessage Entity

- `MailMessageId`
- `MailboxId`
- `CorrelationId`
- `Subject`
- `FromAddress`
- `ToAddresses`
- `CcAddresses`
- `BccAddresses`
- `Status`
- `MessageType`
- `BodyArtifactId`
- `CreatedAtUtc`
- `SentAtUtc`
- `DeliveredAtUtc`
- `ReadAtUtc`
- `ArchivedAtUtc`
- `ReplyToMessageId`
- `ThreadId`

### Mail Status

- `Draft`
- `Queued`
- `Sent`
- `Delivered`
- `Read`
- `Archived`
- `Failed`

### Mail Message Type

- `AgentNote`
- `TaskUpdate`
- `Question`
- `Decision`
- `Escalation`
- `ReadReceipt`
- `SystemNotification`

---

## 11.4 Mailbox Invariants

- Every agent instance must have a mailbox.
- Messages must retain immutable audit timestamps once delivered/read.
- Mail content should be stored durably as artifacts or files, not transient only.

---

## 12. ProviderDefinition Aggregate

## 12.1 Purpose

Represents a supported execution platform/runtime pack.

Examples:

- Claude Code
- OpenClaw
- Opencode
- Gemini
- Codex
- Copilot
- Ollama-backed runtime

---

## 12.2 ProviderDefinition Entity

- `ProviderDefinitionId`
- `Name`
- `Slug`
- `Version`
- `Description`
- `ImageRef`
- `BaseImageType`
- `IsEnabled`
- `AuthStrategy`
- `CapabilityFlags`
- `LaunchContract`
- `ParsingContract`
- `MetricsContract`
- `MailboxSupportLevel`
- `DashboardSupportLevel`
- `TaskLoopSupportLevel`

### CapabilityFlags

Examples:

- `SupportsTaskPluginLoop`
- `SupportsStructuredToolLogs`
- `SupportsTokenMetrics`
- `SupportsCacheMetrics`
- `SupportsDynamicModelSwitching`
- `SupportsMailboxNotifications`
- `SupportsSubagents`
- `SupportsAgentDashboard`

---

## 12.3 ProviderDefinition Invariants

- A provider must declare its capability flags.
- A provider must declare its launch strategy and auth expectations.
- A provider must have a compatibility contract for workflows it claims to support.

---

## 13. Compatibility Model

Compatibility must be explicit, not implicit.

### WorkflowProviderCompatibility

- `WorkflowProviderCompatibilityId`
- `WorkflowDefinitionId`
- `ProviderDefinitionId`
- `SupportLevel`
- `SupportedStages`
- `UnsupportedFeatures`
- `RequiredPlugins`
- `RequiredSkills`
- `RequiredHooks`
- `RequiredEnvironment`
- `Notes`

### SupportLevel

- `FirstClass`
- `Supported`
- `Experimental`
- `Partial`
- `Unsupported`

---

## 14. Artifact Model

## 14.1 Purpose

Artifacts represent durable outputs, inputs, logs, summaries, generated files, and provider metadata.

Artifacts should be the generic durability primitive for files and generated content.

---

## 14.2 Artifact Entity

- `ArtifactId`
- `JobId`
- `AgentInstanceId`
- `StageId`
- `TaskId`
- `ArtifactType`
- `Name`
- `ContentType`
- `StorageLocation`
- `Checksum`
- `SizeBytes`
- `CreatedAtUtc`
- `CreatedByType`
- `CreatedById`
- `Summary`
- `Metadata`

### ArtifactType

- `RawLog`
- `ParsedLog`
- `Prompt`
- `Response`
- `ToolUse`
- `TodoFile`
- `Report`
- `Summary`
- `GeneratedFile`
- `MailBody`
- `MetricSnapshot`
- `ProviderPayload`
- `TimelineExport`

---

## 15. Report Aggregate

## 15.1 Purpose

Represents the synthesized final or partial output of a job, stage, or task.

---

## 15.2 Report Entity

- `ReportId`
- `JobId`
- `StageId`
- `TaskId`
- `ReportType`
- `Title`
- `Status`
- `SummaryArtifactId`
- `BodyArtifactId`
- `GeneratedAtUtc`
- `GeneratedByType`
- `GeneratedById`

### ReportType

- `FinalJobReport`
- `StageReport`
- `TaskReport`
- `FailureReport`
- `ReviewReport`
- `ResearchReport`

### Report Status

- `Draft`
- `Generated`
- `Superseded`
- `Archived`

### Invariants

- Every job must have at least one final report or failure report.

---

## 16. Metrics and Billing Approximation Model

## 16.1 MetricSnapshot

- `MetricSnapshotId`
- `JobId`
- `AgentInstanceId`
- `StageId`
- `TaskId`
- `CapturedAtUtc`
- `MetricType`
- `MetricPayload`

### MetricType

- `TokenUsage`
- `ModelUsage`
- `CacheUsage`
- `BillingEstimate`
- `Latency`
- `LoopIteration`
- `Heartbeat`

---

## 16.2 TokenUsageSnapshot Value Object

- `InputTokens`
- `OutputTokens`
- `TotalTokens`
- `ModelName`
- `PromptCacheReadTokens`
- `PromptCacheWriteTokens`
- `ModelCacheReadTokens`
- `ModelCacheWriteTokens`
- `EstimatedCacheBreaks`

---

## 16.3 BillingEstimate Value Object

- `Currency`
- `EstimatedCost`
- `ConfidenceLevel`
- `EstimationBasis`

### ConfidenceLevel

- `Low`
- `Medium`
- `High`

---

## 17. Event and Timeline Model

The domain requires both low-level events and user-facing timeline entries.

### JobEvent

- `JobEventId`
- `JobId`
- `AgentInstanceId`
- `StageId`
- `TaskId`
- `OccurredAtUtc`
- `EventType`
- `Severity`
- `Payload`
- `CorrelationId`

### TimelineEntry

- `TimelineEntryId`
- `JobId`
- `OccurredAtUtc`
- `Title`
- `Description`
- `Category`
- `RelatedArtifactIds`
- `RelatedAgentIds`
- `RelatedStageIds`
- `RelatedTaskIds`

### EventType Examples

- `JobCreated`
- `ContainerStarted`
- `StageStarted`
- `TaskGenerated`
- `PromptSent`
- `ToolInvoked`
- `CommitDetected`
- `MailReceived`
- `StageCompleted`
- `JobCompleted`
- `JobFailed`

### Severity

- `Trace`
- `Info`
- `Warning`
- `Error`
- `Critical`

---

## 18. Iteration Model

Iteration is core enough to model directly.

### JobIterationCounter

- `JobIterationCounterId`
- `JobId`
- `Scope`
- `ScopeKey`
- `CurrentValue`
- `MaximumValue`
- `IncrementedAtUtc`
- `Source`

### Scope

- `Job`
- `Stage`
- `Task`
- `WorkflowCustom`

### Examples

- `iterations`
- `iterations__stage`
- `iterations__task`
- `iterations__planning`
- `iterations__review`
- `iterations__debug`

The parser should preserve arbitrarily nested workflow-specific counters even if the system only natively enforces a subset.

---

## 19. TODO Contract Model

Because TODO.md is a key durability primitive, represent its parsed state.

### TodoDocumentSnapshot

- `TodoDocumentSnapshotId`
- `JobId`
- `WorkspaceId`
- `ObservedAtUtc`
- `RawArtifactId`
- `ParsedSections`
- `ParsedTasks`
- `ActiveStageName`
- `Summary`

### TodoItemProjection

- `TodoItemId`
- `ParentTodoItemId`
- `Label`
- `Status`
- `StageName`
- `TaskBindingId`
- `Order`

### TodoItemStatus

- `Unchecked`
- `Checked`
- `Blocked`
- `Deferred`

---

## 20. Devcontainer Model

Devcontainer support should not be hand-waved. The domain needs enough structure to reference it without embedding editor internals everywhere.

### DevcontainerReference

- `DevcontainerReferenceId`
- `WorkspaceId`
- `DefinitionLocation`
- `DockerfileRef`
- `ComposeRef`
- `FeatureRefs`
- `PostCreateCommands`
- `PostStartCommands`
- `RemoteUser`
- `WorkspaceFolder`
- `Mounts`
- `ForwardedPorts`

### DevcontainerMode

- `Disabled`
- `Advisory`
- `Overlay`
- `Required`

---

## 21. Read Models / Projections

The write model can be normalized, but the UI needs optimized projections.

Recommended read models:

### JobSummaryProjection

- job title
- provider
- primary model
- state
- outcome
- active stage
- active task
- duration
- connection status

### JobDashboardProjection

- parameters
- stage/task tree
- live logs
- timeline
- git activity
- mailbox summary
- artifact summary
- metric summary

### AgentDashboardProjection

- agent info
- current task/stage
- mailbox preview
- model history
- tool usage summary
- modified files

### WorkflowCatalogProjection

- workflow metadata
- versions
- compatibility matrix

---

## 22. Domain Services

Some behavior should live in domain services rather than aggregates.

### Candidate domain services

- `WorkflowExpansionService`
- `StageGateEvaluationService`
- `IterationPolicyService`
- `ProviderCompatibilityService`
- `ArtifactClassificationService`
- `ReportCompilationService`
- `MailboxDeliveryService`
- `GitObservationService`
- `TodoParsingService`
- `FailureClassificationService`
- `BillingEstimationService`

---

## 23. Domain Policies

### Completion policy

A job may be runtime-complete but not business-successful.

### Failure policy

Fatal provider failures should classify differently from incomplete work or partial success.

### Durability policy

Any important user-facing or recovery-relevant data must be written to an artifact, report, mailbox item, TODO file, or event store.

### Compatibility policy

Workflows may degrade gracefully, but unsupported features must be visible and explicit.

---

## 24. Entity Relationship Summary

### Primary relationships

- One `WorkflowDefinition` to many `Job`s
- One `Job` to many `JobStageInstance`s
- One `JobStageInstance` to many `JobTaskInstance`s
- One `Job` to many `AgentInstance`s
- One `AgentInstance` to one `Mailbox`
- One `Job` to many `Artifact`s
- One `Job` to many `MetricSnapshot`s
- One `Job` to many `JobEvent`s
- One `Job` to many `TimelineEntry`s
- One `Job` to one or more `WorkspaceBinding`s
- One `ProviderDefinition` to many `AgentInstance`s
- One `WorkflowDefinition` to many `WorkflowProviderCompatibility` records

---

## 25. Suggested Aggregate Boundaries for Implementation

To avoid a giant god aggregate, keep boundaries practical:

### Aggregate roots

- `Job`
- `WorkflowDefinition`
- `Workspace`
- `AgentInstance`
- `Mailbox`
- `ProviderDefinition`
- `Report`

### Reference by identity between aggregates

Do not attempt to load the entire runtime graph as a single aggregate in code.

The likely implementation should use:

- normalized persistence
- specialized read models/projections
- domain services for orchestration-heavy logic

---

## 26. Key Invariants to Enforce Early

1. Every job has at least one stage.
2. Every job has at least one task at creation.
3. Every agent has a mailbox.
4. Every job has a report on termination.
5. Every job has at least one workspace binding.
6. Every workflow/provider pairing must have explicit compatibility semantics.
7. Runtime state, business outcome, and connection status remain distinct concepts.
8. Important outputs must become durable artifacts.

---

## 27. Summary

The OpenAgents domain centers on a Job aggregate that coordinates workflows, agents, workspaces, stages, tasks, providers, artifacts, events, and reports.

The most important modeling decisions are:

- definition vs instance separation
- runtime state vs business outcome separation
- provider portability through explicit compatibility modeling
- durability through artifacts, reports, mailbox, TODO, and events
- practical aggregate boundaries to prevent orchestration logic from becoming a monolith

This model is intentionally shaped to support both a clean backend implementation and a rich real-time dashboard without collapsing into one giant unstructured configuration object.
