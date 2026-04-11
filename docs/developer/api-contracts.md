# API & Contracts

## Primary endpoints

- `GET /healthz`
- `GET/POST /api/v1/jobs`
- `GET /api/v1/jobs/{id}`
- `POST /api/v1/jobs/{id}/start`
- `POST /api/v1/jobs/{id}/stop`
- `GET /api/v1/jobs/{id}/stages`
- `GET /api/v1/jobs/{id}/tasks`
- `GET /api/v1/jobs/{id}/events`
- `GET /api/v1/jobs/{id}/artifacts`
- `GET/POST/PUT /api/v1/workflows`
- `GET/POST/PUT /api/v1/providers`

## Compatibility guidance

- Keep snake_case JSON fields stable for web hooks/types.
- Add integration tests for any changed contract shape.
