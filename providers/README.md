# Providers

Provider adapter definitions for OpenAgents.

Each provider encapsulates the CLI-specific behavior needed to launch, supervise,
and parse output from a specific agentic CLI tool.

## Structure

```
providers/
  <provider-id>/
    provider.yaml       # metadata + capability flags
    adapter/            # .NET adapter code (Milestone 4)
    Dockerfile          # provider-specific agent image (Milestone 4)
    README.md
```

## Registered Providers

| Provider ID | CLI Tool    | Support     | Status      |
| ----------- | ----------- | ----------- | ----------- |
| claude-code | Claude Code | first_class | Milestone 4 |

## Adding a Provider

1. Create `providers/<id>/provider.yaml`
2. Declare `capabilities` (streaming, tools, caching, etc.)
3. Implement `IProviderAdapter` in the API layer
4. Create a provider image `FROM images/base-agent`
5. Register in `appsettings.json`

See `docs/plans/PROVIDER-CONTRACT.md` for the full adapter contract.
