-- ──────────────────────────────────────────────────────────────────────────────
-- infra/docker/postgres/init.sql
--
-- Initial schema for OpenAgents v1.
-- Applied automatically by the postgres Docker image on first start
-- (place in /docker-entrypoint-initdb.d/ via volume mount).
--
-- v1 persistence model: CRUD + append-only event log (not full event sourcing).
-- Tables:
--   workflow_definitions  – seeded workflow metadata
--   jobs                  – one row per orchestrated job
--   event_log             – append-only event timeline (never updated/deleted)
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- text search on titles

-- ── Workflow Definitions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id              UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    slug            TEXT        NOT NULL UNIQUE,     -- e.g. "planning"
    name            TEXT        NOT NULL,
    version         TEXT        NOT NULL DEFAULT '0.1.0',
    category        TEXT        NULL,
    description     TEXT        NULL,
    is_enabled      BOOLEAN     NOT NULL DEFAULT TRUE,
    is_experimental BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at_utc  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the v1 planning workflow
INSERT INTO workflow_definitions (slug, name, version, category, description)
VALUES ('planning', 'Planning', '0.1.0', 'development',
        'A single-stage planning workflow that produces a structured plan document.')
ON CONFLICT (slug) DO NOTHING;

-- ── Jobs ────────────────────────────────────────────────────────────────────
-- JobState  (mirrors OpenAgents.Domain.Enums.JobState)
-- 0=Pending 1=Queued 2=Provisioning 3=Connecting 4=Running
-- 5=Paused  6=Stopping 7=Completed 8=Error 9=Archived
--
-- JobOutcome (mirrors OpenAgents.Domain.Enums.JobOutcome)
-- 0=NotStarted 1=CompletedSuccessfully 2=CompletedAbnormally
-- 3=CompletedWithErrors 4=PartiallyCompleted 5=Incomplete
-- 6=Failed 7=Invalid
CREATE TABLE IF NOT EXISTS jobs (
    id                      UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    title                   TEXT        NOT NULL,
    description             TEXT        NULL,

    -- Execution context
    workflow_definition_id  UUID        NOT NULL REFERENCES workflow_definitions(id),
    workflow_version        TEXT        NOT NULL DEFAULT '0.1.0',
    workflow_category       TEXT        NULL,
    primary_provider_id     TEXT        NOT NULL DEFAULT 'claude-code',
    primary_model           TEXT        NULL,

    -- State (integer enums matching C# domain)
    state                   SMALLINT    NOT NULL DEFAULT 0,   -- JobState
    outcome                 SMALLINT    NOT NULL DEFAULT 0,   -- JobOutcome
    connection_status       SMALLINT    NOT NULL DEFAULT 0,   -- ConnectionStatus

    -- Container tracking
    container_id            TEXT        NULL,
    workspace_host_path     TEXT        NULL,

    -- Git context
    source_git_branch       TEXT        NULL,
    working_git_branch      TEXT        NULL,
    target_git_branch       TEXT        NULL,

    -- Timestamps
    created_at_utc          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    queued_at_utc           TIMESTAMPTZ NULL,
    started_at_utc          TIMESTAMPTZ NULL,
    finished_at_utc         TIMESTAMPTZ NULL,
    archived_at_utc         TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_state         ON jobs (state);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at    ON jobs (created_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_workflow_id   ON jobs (workflow_definition_id);

-- ── Event Log ───────────────────────────────────────────────────────────────
-- Append-only. Never UPDATE or DELETE rows in this table.
-- Rows are inserted by the orchestrator's FileSystemWatcher when it detects
-- new .json files in <workspace>/.agent-orch/events/.
-- The orchestrator then broadcasts each inserted row via SSE to UI clients.
CREATE TABLE IF NOT EXISTS event_log (
    id              BIGSERIAL   NOT NULL PRIMARY KEY,  -- insertion order (timeline)
    event_id        TEXT        NOT NULL UNIQUE,        -- evt_<hex16> from emit-event.sh
    schema_version  TEXT        NOT NULL DEFAULT '1.0.0',
    event_type      TEXT        NOT NULL,               -- e.g. "job.started"

    -- Correlation (nullable — not all events have all fields)
    job_id          UUID        NULL REFERENCES jobs(id) ON DELETE SET NULL,
    workflow_id     TEXT        NULL,
    workflow_version TEXT        NULL,
    stage_id        TEXT        NULL,
    task_id         TEXT        NULL,
    agent_id        TEXT        NULL,
    correlation_id  TEXT        NULL,

    -- Source
    source_kind         TEXT    NULL,
    source_instance_id  TEXT    NULL,
    source_provider_id  TEXT    NULL,

    -- Content
    severity        TEXT        NOT NULL DEFAULT 'info',
    title           TEXT        NOT NULL,
    summary         TEXT        NULL,
    payload         JSONB       NOT NULL DEFAULT '{}',
    extensions      JSONB       NOT NULL DEFAULT '{}',

    -- Timestamps (from the event file itself)
    occurred_at_utc TIMESTAMPTZ NOT NULL,
    recorded_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Raw source file path for debugging
    source_file     TEXT        NULL
);

CREATE INDEX IF NOT EXISTS idx_event_log_job_id       ON event_log (job_id);
CREATE INDEX IF NOT EXISTS idx_event_log_event_type   ON event_log (event_type);
CREATE INDEX IF NOT EXISTS idx_event_log_occurred_at  ON event_log (occurred_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_event_log_recorded_at  ON event_log (recorded_at_utc DESC);

-- ── Schema version tracking ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     TEXT        NOT NULL PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO schema_migrations (version) VALUES ('v1.0.0') ON CONFLICT DO NOTHING;
