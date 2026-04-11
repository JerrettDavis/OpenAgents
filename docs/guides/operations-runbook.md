# Operations Runbook

## Health checks

- API health: `GET /healthz`
- Compose validation: `pnpm validate:compose`
- Provider matrix validation: `pnpm --filter orchestrator-web e2e`

## Common commands

```bash
# Build provider images
bash scripts/build-images.sh

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
- Confirm the selected workflow lists the provider in its compatibility matrix

### E2E fails locally

- Ensure ports 5080 and 3080 are free (Playwright webServer)
- Re-run: `pnpm --filter orchestrator-web e2e`
- Do not run `pnpm build` concurrently with Playwright; both touch the same Next.js output

### Docker runtime cannot start a provider container

- Build the provider images first: `bash scripts/build-images.sh`
- Confirm the relevant image ref env var points at a built image (`*_IMAGE_REF`)
- Confirm the provider credential env var is present in the orchestrator-api container

### Containerized API unhealthy

- Check db readiness: `docker compose ps`
- Inspect API logs: `docker compose logs orchestrator-api`
