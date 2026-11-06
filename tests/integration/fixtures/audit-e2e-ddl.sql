-- 同步来源: deploy/postgres/init/120-audit-events.sql
-- 仅用于 E2E 隔离 schema audit_e2e；改表时两处都要改
CREATE SCHEMA IF NOT EXISTS audit_e2e;

CREATE TABLE IF NOT EXISTS audit_e2e.events (
  seq bigint PRIMARY KEY,
  event_id uuid UNIQUE NOT NULL,
  occurred_at timestamptz NOT NULL,
  actor_id text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  module text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  patient_id text,
  result text NOT NULL,
  error_code text,
  ip text NOT NULL,
  user_agent text NOT NULL,
  prev_hash text NOT NULL,
  hash text NOT NULL,
  tenant_id text
);

CREATE INDEX IF NOT EXISTS audit_e2e_events_occurred_idx ON audit_e2e.events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_e2e_events_actor_idx ON audit_e2e.events (actor_id, occurred_at DESC);
