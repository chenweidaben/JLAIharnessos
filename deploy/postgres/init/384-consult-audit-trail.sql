-- ============================================================================
-- 健澜AI原生医院操作系统OS · M86 consult-agent 智能咨询助手迁移（380–385）
--
-- 本文件（384）：咨询助手审计轨迹 consult.audit_trail；父表 consult.threads（见 380）。
--
-- 医疗安全红线：
--  - 四角色（supervisor/examiner/doctor/pharmacist）、system、user 全程留痕，
--    每条审计透传 trace_id，跨消息/工具/草稿可串联回放；
--  - 急症旁路（acute_bypass）独立审计：会话转 escalated、不进角色编排、不产草稿；
--  - 工具审计只留 tool_name/tool_status/duration_ms/evidence_count/error_class/摘要，
--    detail 为脱敏后结构化摘要，禁止记录原始入参明文；
--  - 审计记录一经落库不可变更（无 updated_at、无更新触发器），随线程级联删除仅用于
--    线程回收，正常业务审计不允许改写历史条目。
--
-- 权限码（登记与角色授权见 380-consult-threads.sql 末段）：
--   consult-agent:audit 查看审计轨迹（仅 admin）；read/write 角色不授予审计码。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS consult;

-- ---------------------------------------------------------------------------
-- 角色/工具/急症旁路审计轨迹（trace_id 透传；detail 脱敏后结构化摘要）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consult.audit_trail (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id      uuid NOT NULL REFERENCES consult.threads(id) ON DELETE CASCADE,
  actor_role     text NOT NULL CHECK (actor_role IN ('supervisor','examiner','doctor',
                                     'pharmacist','system','user')),
  action         text NOT NULL,
  tool_name      text,
  tool_status    text CHECK (tool_status IS NULL OR tool_status IN ('success','error','skipped')),
  duration_ms    int,
  evidence_count int,
  error_class    text,
  trace_id       text NOT NULL,
  detail         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consult_audit_thread_created
  ON consult.audit_trail(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_consult_audit_trace
  ON consult.audit_trail(trace_id);
