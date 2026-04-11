# DASHBOARD UX SPECIFICATION

## 1. Overview

The OpenAgents dashboard is a **developer-first, information-dense, real-time control surface** for orchestrating, observing, and debugging agent workflows.

The design should feel closer to:

- Adobe tools (Photoshop, After Effects, Illustrator)
- Modern devtools (Chrome DevTools, VS Code, Raycast)
- Observability dashboards (Grafana, Datadog)

…not a typical CRUD SaaS app.

This is a **workspace for thinking, debugging, and controlling systems**, not just viewing data.

---

## 2. Design Principles

### 2.1 Information Density without Chaos

- High information density
- Clear visual hierarchy
- Progressive disclosure
- Minimal cognitive overload

### 2.2 Developer-Centric UX

- Keyboard-first interactions
- Fast navigation
- Copy/paste-friendly data
- Inspectable everything

### 2.3 Real-Time by Default

- Live updating views
- Streaming logs
- Instant feedback loops

### 2.4 Modular + Extensible

- Panels are composable
- Layouts are configurable
- New widgets can be added without redesign

### 2.5 Familiar Patterns

- Dockable panels
- Resizable panes
- Tabs and split views
- Inspector sidebars

### 2.6 Theme Awareness

- Dark mode (primary)
- Light mode (secondary)
- System-aware switching

---

## 3. Visual Design System

### 3.1 Foundation

Use a system inspired by:

- shadcn/ui
- Tailwind
- Radix primitives

### 3.2 Themes

#### Dark Mode (Primary)

- Deep neutral backgrounds (near-black, not pure black)
- Subtle elevation layers
- High-contrast text
- Accent color for active state

#### Light Mode

- Soft whites
- Muted grays
- Reduced glare

#### System Mode

- Auto-switch based on OS

---

### 3.3 Color System

#### Base

- Background: neutral-950 (dark), neutral-50 (light)
- Surface: neutral-900 / neutral-100
- Borders: neutral-800 / neutral-200

#### Semantic

- Success: green
- Warning: amber
- Error: red
- Info: blue

#### Status Colors

- Running: blue
- Completed: green
- Failed: red
- Pending: gray
- Archived: muted

---

### 3.4 Typography

- Monospace for logs and technical data
- Sans-serif for UI
- Clear hierarchy:
  - Title
  - Section header
  - Label
  - Value

---

## 4. Layout System

### 4.1 Global Layout

```
┌─────────────────────────────────────┐
│ Top Bar                            │
├──────────────┬──────────────────────┤
│ Sidebar      │ Main Workspace       │
│ Navigation   │                      │
│              │                      │
└──────────────┴──────────────────────┘
```

---

### 4.2 Top Bar

Contains:

- Global search
- Job quick actions
- Theme toggle
- Notifications
- System status

---

### 4.3 Sidebar

Sections:

- Dashboard
- Jobs
- Workflows
- Providers
- Agents
- Artifacts
- Settings

---

### 4.4 Workspace Area

Dynamic, multi-panel layout:

- Tabbed views
- Split panes
- Dockable components

---

## 5. Core Views

## 5.1 Global Dashboard

### Sections

#### Job Overview

- Running jobs
- Pending jobs
- Completed jobs
- Failed jobs

#### Activity Feed

- Live timeline events

#### Metrics Summary

- Token usage
- Model usage
- Job durations

#### System Health

- Container health
- Connection status

---

## 5.2 Jobs List View

### Features

- Table + card view toggle
- Filtering
- Sorting
- Search

### Columns

- Title
- Workflow
- Provider
- State
- Outcome
- Duration
- Active stage

---

## 5.3 Job Detail View (Core Experience)

This is the most important screen.

### Layout (Multi-Pane)

```
┌───────────────────────────────┐
│ Header                        │
├──────────────┬────────────────┤
│ Left Panel   │ Main Panel     │
│              │                │
├──────────────┴────────────────┤
│ Bottom Panel (Logs/Events)    │
└───────────────────────────────┘
```

---

### Header

- Job title
- State + outcome
- Controls (stop, retry, archive)
- Duration

---

### Left Panel (Navigation)

- Stages tree
- Tasks list
- Agents list
- Mailbox summary

---

### Main Panel (Tabs)

Tabs:

- Overview
- Stages
- Tasks
- Timeline
- Git
- Mailbox
- Artifacts
- Metrics
- Report

---

### Bottom Panel

Dockable tabs:

- Logs (raw)
- Logs (parsed)
- Event stream

---

## 5.4 Agent View

### Shows

- Current stage/task
- Logs
- Mailbox
- Tool usage
- Modified files
- Model history

---

## 5.5 Mailbox View

### Layout

- Thread list
- Message viewer
- Compose panel

### Features

- Thread grouping
- Correlation tracking
- Quick reply

---

## 5.6 Timeline View

### Features

- Chronological events
- Filters by type
- Expandable payloads

---

## 5.7 Git View

### Features

- Branches
- Commits
- Diff preview
- Worktrees

---

## 5.8 Metrics View

### Displays

- Token usage
- Cache usage
- Model distribution
- Iteration counts

---

## 6. Interaction Design

### 6.1 Keyboard Shortcuts

- Quick search
- Switch panels
- Jump to logs
- Open command palette

### 6.2 Command Palette

Like VS Code / Raycast:

- Run job
- Switch views
- Filter data
- Execute actions

---

### 6.3 Context Menus

- Right-click actions on jobs, tasks, agents

---

### 6.4 Drag and Dock

- Panels can be rearranged
- Layout saved per user

---

## 7. Real-Time Behavior

- **Streaming updates via SSE (Server-Sent Events) — locked for v1**
- WebSockets — deferred to post-v1
- Incremental UI updates
- Visual indicators for live activity

---

## 8. Extensibility

### Panel System

- Panels registered via plugin system
- Each panel declares:
  - data dependencies
  - layout preferences

### Widget Slots

- Metrics widgets
- Custom views

---

## 9. Accessibility

- Keyboard navigation
- High contrast mode
- Screen reader compatibility

---

## 10. Performance Considerations

- Virtualized lists
- Lazy loading
- Incremental rendering

---

## 11. Design Anti-Goals

Avoid:

- Over-simplified dashboards
- Hidden state
- Excessive modal dialogs
- Non-inspectable UI

---

## 12. Summary

The OpenAgents dashboard is a **power tool**, not a basic UI.

It should:

- Feel fast
- Feel precise
- Feel inspectable
- Handle complex workflows gracefully

The goal is to make debugging and orchestrating agents feel like using professional-grade software, not clicking through forms.
