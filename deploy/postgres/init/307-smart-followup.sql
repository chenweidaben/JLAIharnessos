-- ============================================================================
-- 健澜科技 jlmedaios — M152-D 患者随访智能化（AI能力深化）
--
-- follow_up_plan 扩展表：在原有随访计划基础上新增患者授权与智能分层字段。
-- 合规红线：
--   * auto_followup_enabled 默认 FALSE，必须由患者主动签署知情同意后才开启；
--   * followup_channel 仅允许 短信/微信/电话 三种触达方式；
--   * 自动发送时段由应用层限制在 08:00–20:00，避免打扰患者休息；
--   * rehospitalization_risk 为 AI 辅助预测值（0-100），不替代临床判断。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.follow_up_plan (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id             uuid NOT NULL,
  visit_id               uuid,
  disease                text NOT NULL DEFAULT '',
  discharge_date         date,
  plan_payload           jsonb NOT NULL DEFAULT '[]'::jsonb,
  status                 text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','sent','completed','cancelled')),
  -- ---------------- M152-D 新增字段（AI能力深化） ----------------
  -- 患者主动授权后才为 true；默认 false = 不自动发送，不骚扰患者
  auto_followup_enabled  boolean NOT NULL DEFAULT false,
  -- 触达渠道：短信 / 微信 / 电话
  followup_channel       text NOT NULL DEFAULT 'sms'
                         CHECK (followup_channel IN ('sms','wechat','phone')),
  -- 患者满意度评分（0-5，随访回收后回填）
  satisfaction_score     numeric(2,1) CHECK (satisfaction_score >= 0 AND satisfaction_score <= 5),
  -- AI 预测再入院风险分（0-100，越高风险越大）
  rehospitalization_risk numeric(5,2) CHECK (rehospitalization_risk >= 0 AND rehospitalization_risk <= 100),
  consent_at             timestamptz,
  last_sent_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- 兼容既有库：若表已存在则补齐列
ALTER TABLE clinical.follow_up_plan
  ADD COLUMN IF NOT EXISTS auto_followup_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE clinical.follow_up_plan
  ADD COLUMN IF NOT EXISTS followup_channel text NOT NULL DEFAULT 'sms'
  CHECK (followup_channel IN ('sms','wechat','phone'));
ALTER TABLE clinical.follow_up_plan
  ADD COLUMN IF NOT EXISTS satisfaction_score numeric(2,1);
ALTER TABLE clinical.follow_up_plan
  ADD COLUMN IF NOT EXISTS rehospitalization_risk numeric(5,2);
ALTER TABLE clinical.follow_up_plan
  ADD COLUMN IF NOT EXISTS consent_at timestamptz;
ALTER TABLE clinical.follow_up_plan
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_followup_plan_patient
  ON clinical.follow_up_plan(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_followup_plan_auto_enabled
  ON clinical.follow_up_plan(auto_followup_enabled)
  WHERE auto_followup_enabled = true;

DROP TRIGGER IF EXISTS trg_follow_up_plan_updated ON clinical.follow_up_plan;
CREATE TRIGGER trg_follow_up_plan_updated BEFORE UPDATE ON clinical.follow_up_plan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
