-- ============================================================================
-- 健澜科技 jlmedaios - M183-D 安全审计日志完善
-- 229-audit-log-enhance.sql
--
-- 为 audit.audit_logs 增加 hospital_id 字段（多院隔离）；
-- 字段幂等 IF NOT EXISTS，可重复执行。
-- 注：actor_role（=user_role）、client_ip（=ip_address）、user_agent 已在
--     50-audit.sql 中存在，本迁移仅补齐 hospital_id。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
-- ============================================================================

ALTER TABLE audit.audit_logs ADD COLUMN IF NOT EXISTS hospital_id uuid;

CREATE INDEX IF NOT EXISTS idx_audit_hospital_time
  ON audit.audit_logs(hospital_id, created_at DESC);
