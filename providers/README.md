# Providers

Provider adapter definitions for OpenAgents.

Each provider encapsulates the CLI-specific behavior needed to launch, supervise,
and parse output from a specific agentic CLI tool.

The orchestrator loads provider metadata from each `provider.yaml` at startup and
upserts those definitions into the API database. Container image refs can be
overridden per provider with environment variables such as `CLAUDE_CODE_IMAGE_REF`
or `CODEX_IMAGE_REF`.

## Structure

```
providers/
  <provider-id>/
    provider.yaml       # metadata + capability flags
    Dockerfile          # provider-specific agent image (Milestone 4)
    scripts/
```

## Registered Providers

| Provider ID | CLI Tool    | Support     | Headless status |
| ----------- | ----------- | ----------- | --------------- |
| claude-code | Claude Code | first_class | Ready           |
| opencode    | OpenCode    | supported   | Ready           |
| codex       | Codex       | supported   | Ready           |
| gemini      | Gemini      | supported   | Ready           |
| copilot     | Copilot     | supported   | Ready           |

## Adding a Provider

1. Create `providers/<id>/provider.yaml`
2. Declare `capabilities`, `auth`, and `image.ref`
3. Create a provider image `FROM images/base-agent`
4. Add an entrypoint under `scripts/`
5. Re-run the API startup/tests so the manifest is seeded into the provider catalog

See `docs/plans/PROVIDER-CONTRACT.md` for the full adapter contract.
