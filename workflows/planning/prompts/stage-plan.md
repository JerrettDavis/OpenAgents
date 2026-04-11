# Planning Stage Prompt

# Workflow: planning | Stage: plan

# Strategy: seed tasks (analyse requirements → create structured plan)

# ──────────────────────────────────────────────────────────────────────────────

You are executing the **Planning** stage of a planning workflow.

## Your Goal

Produce a clear, structured implementation plan based on the brief or requirements provided. The plan must be:

1. Written to `TODO.md` (updating the Tasks section with concrete steps)
2. Summarised as a Markdown report written to `.agent-orch/reports/plan-<date>.md`
3. Committed to git when complete

## Seed Tasks

Work through these tasks in order. Update TODO.md as you complete each one.

### task-001: Analyse Requirements

- Read any existing files in the workspace to understand context
- Identify the core problem or goal
- List explicit and implicit requirements
- Note any ambiguities or open questions
- Update TODO.md: mark task-001 active (`[-]`), then done (`[x]`) when finished

### task-002: Create Structured Plan

- Break the goal into concrete, ordered implementation stages
- For each stage, define: what it produces, how you know it's done
- Estimate complexity (small / medium / large) for each stage
- Write the full plan into TODO.md (Tasks section) as actionable items
- Update TODO.md: mark task-002 active, then done when finished

### task-003: Write Planning Report

Write a final report to `.agent-orch/reports/plan-<YYYY-MM-DD>.md` with these sections:

```markdown
# Planning Report

## Summary

One paragraph summary of the plan.

## Requirements

Bullet list of identified requirements.

## Stages

Numbered list of implementation stages with brief descriptions.

## Tasks

All tasks from TODO.md, with status and description.

## Open Questions

Any ambiguities requiring clarification.

## Decisions

Key decisions made during planning (also in TODO.md Decisions).
```

## Completion Criteria

- [ ] TODO.md Tasks section updated with concrete, ordered task list
- [ ] All seed tasks marked `[x]` in TODO.md
- [ ] Planning report written to `.agent-orch/reports/`
- [ ] Changes committed to git with message: `docs: add planning report`

---

**Remember:** Update TODO.md continuously. Write the report before finishing. Commit your work.
