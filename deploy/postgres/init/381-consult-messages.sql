-- ============================================================================
-- 健澜AI原生医院操作系统OS · M86 consult-agent 智能咨询助手迁移（380–385）
--
-- 本文件（381）：会话消息 consult.messages；父表 consult.threads（见 380）。
--
-- 医疗安全红线：
--  - AI 回复仅为辅助科普与就诊参考，每条 assistant 消息携带免责声明，不构成诊断；
--  - 急症旁路消息为 system/assistant 引导，不含诊疗结论；
--  - tool_calls 仅保留工具调用记录（callId/name/status/耗时/证据数/错误分类/摘要），
--    禁止保存与回显原始入参明文；
--  - 消息一经落库不可变更（无 updated_at、无更新触发器），审计由 consult.audit_trail 承担。
--
-- 权限码（登记与角色授权见 380-consult-threads.sql 末段）：
--   consult-agent:read   读取历史消息；consult-agent:write 发送消息/转写/流式会话。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS consult;

-- ---------------------------------------------------------------------------
-- 会话消息（role: user/assistant/tool/system；消息随线程级联删除）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consult.messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id     uuid NOT NULL REFERENCES consult.threads(id) ON DELETE CASCADE,
  role          text NOT NULL CHECK (role IN ('user','assistant','tool','system')),
  content       text NOT NULL DEFAULT '',
  intent        text CHECK (intent IS NULL OR intent IN ('greeting','symptom_report',
                                'clarification_answer','medication_question','chronic_management',
                                'acute_emergency','document_upload','exit','unknown')),
  role_kind    text CHECK (role_kind IS NULL OR role_kind IN
                                ('supervisor','examiner','doctor','pharmacist')),
  tool_calls    jsonb NOT NULL DEFAULT '[]'::jsonb,
  tool_name     text,
  safety_level  text NOT NULL DEFAULT 'normal'
                CHECK (safety_level IN ('normal','caution','acute')),
  disclaimer    text NOT NULL DEFAULT '',
  trace_id      text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consult_messages_thread_created
  ON consult.messages(thread_id, created_at ASC);
