-- Migration: Distributed Tracing
-- Run once against the production database.
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- 1. Create spans table
CREATE TABLE IF NOT EXISTS spans (
    id             SERIAL PRIMARY KEY,
    trace_id       VARCHAR(32)  NOT NULL,
    span_id        VARCHAR(16)  NOT NULL UNIQUE,
    parent_span_id VARCHAR(16)  NULL,
    operation      VARCHAR(500) NOT NULL,
    service_name   VARCHAR      NOT NULL,
    tenant_id      VARCHAR      NULL,
    user_id        INTEGER      REFERENCES users(id) ON DELETE CASCADE,
    start_time     TIMESTAMPTZ  NOT NULL,
    end_time       TIMESTAMPTZ  NULL,
    duration_ms    FLOAT        NULL,
    attributes     JSONB        NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spans_trace_start      ON spans (trace_id, start_time);
CREATE INDEX IF NOT EXISTS idx_spans_service_created  ON spans (service_name, created_at);
CREATE INDEX IF NOT EXISTS idx_spans_user_created     ON spans (user_id, created_at);

-- 2. Add trace_id to incidents
ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS trace_id VARCHAR(32) NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_trace_id ON incidents (trace_id);

-- 3. Add trace_id to incident_events
ALTER TABLE incident_events
    ADD COLUMN IF NOT EXISTS trace_id VARCHAR(32) NULL;

CREATE INDEX IF NOT EXISTS idx_incident_events_trace_id ON incident_events (trace_id);
