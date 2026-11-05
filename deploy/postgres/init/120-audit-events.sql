-- ============================================================================
-- 健澜AI原生医院操作系统OS - 审计事件持久化（P5-13）
-- 120-audit-events.sql
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS audit;

-- 全链路审计事件（等保三级）。seq 严格连续（由 PgAuditStore 在事务内
-- 用 pg_advisory_xact_lock + COALESCE(MAX(seq),0)+1 分配，不用 bigserial，
-- 避免事务回滚跳号导致 WORM checkSeqContinuity 永久 broken）。
CREATE TABLE IF NOT EXISTS audit.events (
  seq            bigint PRIMARY KEY,
  event_id       text NOT NULL UNIQUE,
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  actor_id       text NOT NULL,
  actor_role     text NOT NULL,
  action         text NOT NULL,
  module         text NOT NULL,
  resource_type text NOT NULL,
  resource_id    text NOT NULL,
  patient_id     text,
  result         text NOT NULL,
  error_code     text,
  ip             text NOT NULL,
  user_agent     text NOT NULL,
  prev_hash      text NOT NULL,
  hash           text NOT NULL,
  tenant_id      text
);

CREATE INDEX IF NOT EXISTS idx_audit_events_at ON audit.events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_at ON audit.events (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit.events (actor_id, occurred_at DESC);
