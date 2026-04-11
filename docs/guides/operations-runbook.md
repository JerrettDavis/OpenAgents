# Operations Runbook

## Health checks

- API health: `GET /healthz`
- Compose validation: `pnpm validate:compose`

## Common commands

```bash
# Start stack
docker compose up -d --build

# Tail logs
docker compose logs -f

# Stop stack
docker compose down -v
```

## Troubleshooting

### UI cannot create a job

- Confirm API is healthy (`/healthz`)
- Confirm provider exists and is enabled in **Settings**
- Confirm workflow exists and is enabled in **Workflows**

### E2E fails locally

- Ensure ports 5080 and 3080 are free (Playwright webServer)
- Re-run: `pnpm --filter orchestrator-web e2e`

### Containerized API unhealthy

- Check db readiness: `docker compose ps`
- Inspect API logs: `docker compose logs orchestrator-api`
