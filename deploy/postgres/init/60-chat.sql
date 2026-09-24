-- ============================================================================
-- 健澜科技杠OS - 对话会话与消息表
-- 60-chat.sql
--
-- 支撑 AI 问诊多轮对话的真实持久化：会话元信息 + 消息流水 + 工具调用记录。
-- 消息内容支持文本/工具调用/工具结果多种角色，刷新不丢历史。
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

-- 对话会话
CREATE TABLE IF NOT EXISTS agent.conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_no text NOT NULL UNIQUE,           -- 业务编号 c_xxx
  user_id         uuid REFERENCES iam.users(id),  -- 发起用户（可空，系统会话）
  patient_id      uuid REFERENCES clinical.patients(id), -- 关联患者（可空）
  title           text NOT NULL DEFAULT '新对话',
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','archived','deleted')),
  message_count   integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conv_user ON agent.conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_patient ON agent.conversations(patient_id);
CREATE TRIGGER trg_agent_conversations_updated BEFORE UPDATE ON agent.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 对话消息
CREATE TABLE IF NOT EXISTS agent.conversation_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES agent.conversations(id) ON DELETE CASCADE,
  message_no      text NOT NULL,                  -- msg_xxx
  role            text NOT NULL CHECK (role IN ('user','assistant','tool','system')),
  content         text,                           -- 文本内容
  tool_calls      jsonb NOT NULL DEFAULT '[]',    -- 助手发起的工具调用 [{id,name,args}]
  tool_call_id    text,                           -- 工具结果对应的调用 id
  tool_name       text,                           -- 工具结果对应的工具名
  tokens_in       integer NOT NULL DEFAULT 0,
  tokens_out      integer NOT NULL DEFAULT 0,
  latency_ms      integer,
  error           text,                           -- 本轮错误信息（如有）
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON agent.conversation_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_msg_role ON agent.conversation_messages(role);
