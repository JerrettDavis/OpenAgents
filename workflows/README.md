# Workflows

Workflow definitions for OpenAgents.

Each workflow is a self-contained directory:

```
workflows/
  <workflow-name>/
    workflow.yaml       # main definition (see WORKFLOW-SPEC.md)
    prompts/            # prompt templates
    scripts/            # setup/teardown hooks
    templates/          # output templates
    compatibility.json  # provider compatibility matrix
```

## Bundled Workflows

| Workflow | Category    | Status      |
| -------- | ----------- | ----------- |
| planning | development | Milestone 3 |

## Adding a Workflow

1. Create `workflows/<slug>/workflow.yaml`
2. Declare `compatibility.providers`
3. Define ≥1 stage with ≥1 seed task
4. Define `policies.completion`
5. Define `artifacts.report`

See `docs/plans/WORKFLOW-SPEC.md` for full schema.
