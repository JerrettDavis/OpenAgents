# MAILBOX SPECIFICATION

## 1. Overview

The Mailbox system is the **durable communication layer** for OpenAgents.

It enables:

- Agent-to-agent communication
- Agent-to-user communication
- Agent-to-orchestrator communication

The mailbox exists **outside model context**, ensuring that critical coordination, decisions, and knowledge persist beyond token limits.

---

## 2. Design Principles

1. Durable by Default
   - All messages exist as files

2. Human + Machine Readable
   - Messages must be readable and parseable

3. Append-Only Semantics
   - Messages are immutable after send

4. Explicit Lifecycle
   - Draft → Outbox → Sent → Inbox → Archived

5. Observable
   - All mailbox events are emitted as timeline events

6. Low Coupling
   - Agents do not require direct runtime coupling, only filesystem interaction

---

## 3. Filesystem Structure

Each agent (and system actor) has a mailbox:

```
/workspace/.mailbox/
  inbox/
  drafts/
  outbox/
  sent/
  archived/
```

### Directory Semantics

- `inbox/` → incoming messages
- `drafts/` → working notes (never auto-sent)
- `outbox/` → messages awaiting delivery
- `sent/` → delivered messages
- `archived/` → processed messages

---

## 4. Message Format

Messages are stored as **Markdown files with frontmatter**.

### File Naming Convention

```
<timestamp>-<short-subject>-<messageId>.md
```

Example:

```
2026-04-09T12-30-00Z-review-request-abc123.md
```

---

### Message Structure

```markdown
---
id: abc123
correlation_id: xyz789
thread_id: thread-001
subject: Review Request
from: agent://planner
to:
  - agent://reviewer1
  - agent://reviewer2
cc: []
bcc: []
type: TaskUpdate
status: sent
created_at: 2026-04-09T12:30:00Z
sent_at: 2026-04-09T12:31:00Z
delivered_at: null
read_at: null
archived_at: null
---

## Message

Please review the implementation for correctness and completeness.

## Context

- Task: Implement feature X
- Stage: Review

## Attachments

- ./artifacts/task-123-summary.md
```

---

## 5. Message Fields

### Required Fields

- `id`
- `subject`
- `from`
- `to`
- `type`
- `created_at`

### Optional Fields

- `correlation_id`
- `thread_id`
- `cc`, `bcc`
- `sent_at`
- `delivered_at`
- `read_at`
- `archived_at`

---

## 6. Addressing Scheme

### Format

```
agent://<agent-name>
user://<user-id>
orchestrator://system
workflow://<workflow-id>
```

### Rules

- Must be globally unique within a job
- Resolved by orchestrator

---

## 7. Message Types

- `AgentNote`
- `TaskUpdate`
- `Question`
- `Decision`
- `Escalation`
- `ReadReceipt`
- `SystemNotification`

---

## 8. Lifecycle

### Draft

- Created in `drafts/`
- Editable

### Send

- Move to `outbox/`
- System assigns `sent_at`

### Delivery

- System copies to recipient `inbox/`
- Sets `delivered_at`

### Read

- Recipient processes message
- System sets `read_at`
- Optional read receipt emitted

### Archive

- Recipient moves to `archived/`

---

## 9. Delivery Model

### Delivery Mechanism

- Orchestrator watches `outbox/`
- Resolves recipients
- Copies message to inbox
- Updates metadata

### Guarantees

- At-least-once delivery
- Idempotent message IDs

---

## 10. Notification Strategy

> **v1 decision: Boundary-based polling only.** Agents are **not** notified via arbitrary stdin injection into a running process. Instead, the orchestrator writes a notification summary to `.agent-orch/mailbox-index/pending-notifications.md` (appending). Agents **must** check for new inbox messages at each execution boundary:
>
> - Before starting a new stage
> - Before starting a new task
> - After completing a task (before moving on)
>
> Arbitrary stdin injection (sending a message mid-turn while the CLI is actively processing) is deferred to post-v1 as it requires provider-specific support.

### Notification Format

At each boundary, the agent should check `.agent-orch/mailbox-index/pending-notifications.md`. The orchestrator appends one line per unread message in this format:

```
!!YOU GOT MAIL (Sub: Review Request)(From: planner)(Time: 12:30)(Id: abc123)!!
```

After the agent reads a message, it writes a read-receipt file to the outbox and the orchestrator clears the notification from `pending-notifications.md`.

### Examples

```
!!YOU GOT MAIL (Sub: Review Request)(From: planner)(Time: 12:30)(Id: abc123)!!
```

```
!!MESSAGE READ (Sub: Review Request)(To: planner)(Time: 12:35)(Id: abc123)!!
```

### Rules

- Check at every stage/task boundary
- Must be concise
- Must include correlation info

---

## 11. Draft Behavior

Agents are encouraged to:

- Write thoughts to drafts continuously
- Use drafts for memory persistence
- Promote drafts to messages when needed

---

## 12. Threading and Correlation

### thread_id

Groups related messages

### correlation_id

Tracks request/response chains

### Rules

- Responses should reuse `correlation_id`
- Threads should remain consistent

---

## 13. Multi-Agent Coordination Patterns

### Request/Response

- Agent sends request
- Another responds via same correlation_id

### Broadcast

- One message → multiple recipients

### Escalation

- Agent sends to orchestrator or user

### Review Loop

- Planner → Reviewer → Planner

---

## 14. Mailbox Indexing

System maintains:

```
.agent-orch/mailbox-index/
```

Contains:

- Message metadata
- Delivery status
- Read status

---

## 15. Error Handling

### Failed Delivery

- Message moved to `outbox/failed/`
- Error logged

### Duplicate Messages

- Deduplicated by `id`

---

## 16. Security Considerations

- Do not store secrets in messages
- Avoid leaking sensitive data
- Validate sender identity where possible

---

## 17. Validation Rules

- Must contain valid frontmatter
- Must include required fields
- Must have valid recipients

---

## 18. Observability

All mailbox actions emit events:

- MessageCreated
- MessageSent
- MessageDelivered
- MessageRead
- MessageArchived

---

## 19. Example Flow

1. Planner writes draft
2. Moves to outbox
3. Orchestrator delivers to reviewer inbox
4. Reviewer reads and responds
5. Planner receives response
6. Both archive messages

---

## 20. Summary

The Mailbox system enables reliable, durable, and observable communication between agents.

It transforms ephemeral agent conversations into a structured collaboration system that survives context limits and enables complex multi-agent workflows.
