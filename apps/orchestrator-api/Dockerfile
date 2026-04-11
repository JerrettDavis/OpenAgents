# ──────────────────────────────────────────────────────────────
# Stage 1 – build
# ──────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution and project files first for layer-cached restore
COPY OpenAgents.slnx ./
COPY packages/domain/OpenAgents.Domain.csproj packages/domain/
COPY apps/orchestrator-api/OpenAgents.OrchestratorApi.csproj apps/orchestrator-api/

RUN dotnet restore apps/orchestrator-api/OpenAgents.OrchestratorApi.csproj

# Copy source and publish
COPY packages/domain/ packages/domain/
COPY apps/orchestrator-api/ apps/orchestrator-api/

RUN dotnet publish apps/orchestrator-api/OpenAgents.OrchestratorApi.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ──────────────────────────────────────────────────────────────
# Stage 2 – runtime
# ──────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user for minimal surface area
RUN useradd --system --user-group --shell /usr/sbin/nologin appuser \
    && mkdir -p /data \
    && chown appuser:appuser /data
USER appuser

COPY --from=build /app/publish ./
COPY workflows/ /workflows/
COPY providers/ /providers/

# /data is the default volume for the SQLite database (production)
VOLUME /data

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "OpenAgents.OrchestratorApi.dll"]
