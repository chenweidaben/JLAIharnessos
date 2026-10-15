-- ============================================================================
-- 健澜科技 jlmedaios - M108 诊疗反馈学习闭环（Learning Loop）
--
-- 记录医生对 AI 建议的采纳/修改/拒绝决策，作为后续推荐权重在线调整的
-- 训练样本：被多次采纳的建议类型自动升权，被多次拒绝的类型自动降权，
-- 形成「推荐 -> 医生决策 -> 反馈回流 -> 权重调整」的闭环。
--
-- 说明：既有 medmuse 系列表统一落在 clinical  schema；本反馈日志按需求
-- 独立落在 medmuse schema，故在此兜底创建 schema（幂等）。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- AI 诊疗建议反馈日志：每条记录对应一次医生对 AI 建议的处置决策
CREATE TABLE IF NOT EXISTS medmuse.ai_feedback_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_role        text,
  suggestion_type   text,
  patient_id        text,
  context_snapshot  jsonb,
  doctor_decision   text NOT NULL CHECK (doctor_decision IN ('adopted','modified','rejected')),
  modification_note text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 按类型聚合统计的常用索引（GET /feedback/stats 分组扫描）
CREATE INDEX IF NOT EXISTS idx_ai_feedback_type ON medmuse.ai_feedback_log(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created ON medmuse.ai_feedback_log(created_at DESC);
