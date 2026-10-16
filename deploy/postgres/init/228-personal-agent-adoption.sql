-- ============================================================================
-- 健澜科技 jlmedaios - M183-A Doctor MUSE 推荐效果追踪
--
-- 目标：让每条 AI 推荐都能追踪到「哪个医生、在什么场景、采纳/修改/拒绝」，
--       为 computeAdoptionRate 与 identifyLowAdoptionRecommendations 提供数据底座。
--
-- 变更：
--   1. ai_feedback_log 新增 doctor_id 列（幂等 ADD COLUMN IF NOT EXISTS）；
--   2. 新建 personal_agent_recommendations 表，记录每条推荐的下发与结局；
--   3. 权限码 personal_agent:adoption:view。
--
-- 医疗安全：本表为只读统计底座，不回写临床决策；医生决策仍以电子签名为准。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- 1. 给既有反馈日志补 doctor_id（幂等）
ALTER TABLE medmuse.ai_feedback_log
  ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES iam.users(id);

ALTER TABLE medmuse.ai_feedback_log
  ADD COLUMN IF NOT EXISTS recommendation_id uuid;

CREATE INDEX IF NOT EXISTS idx_ai_feedback_doctor
  ON medmuse.ai_feedback_log(doctor_id, created_at DESC);

-- 2. 每条 AI 推荐的下发与结局追踪表
CREATE TABLE IF NOT EXISTS medmuse.personal_agent_recommendations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id         uuid NOT NULL REFERENCES iam.users(id),
  patient_id        text,
  suggestion_type   text NOT NULL,
  suggestion_title  text NOT NULL,
  suggestion_detail text,
  scenario          text,
  -- 结局状态：pending（已下发未处置）/ adopted / modified / rejected
  outcome           text NOT NULL DEFAULT 'pending'
                    CHECK (outcome IN ('pending','adopted','modified','rejected')),
  modification_note text,
  recommended_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pa_recommend_doctor
  ON medmuse.personal_agent_recommendations(doctor_id, recommended_at DESC);
CREATE INDEX IF NOT EXISTS idx_pa_recommend_outcome
  ON medmuse.personal_agent_recommendations(outcome, recommended_at DESC);
CREATE INDEX IF NOT EXISTS idx_pa_recommend_type
  ON medmuse.personal_agent_recommendations(suggestion_type, recommended_at DESC);

DROP TRIGGER IF EXISTS trg_pa_recommend_updated ON medmuse.personal_agent_recommendations;
CREATE TRIGGER trg_pa_recommend_updated BEFORE UPDATE ON medmuse.personal_agent_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('personal_agent:adoption:view', 'Personal Agent 推荐采纳率查看', 'personal_agent',
   '查看 Doctor MUSE 每条推荐的采纳/修改/拒绝率与低采纳推荐识别（医生/admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'personal_agent:adoption:view'
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions
  WHERE role_code = 'doctor' AND permission_code = 'personal_agent:adoption:view'
);
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'personal_agent:adoption:view'
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions
  WHERE role_code = 'admin' AND permission_code = 'personal_agent:adoption:view'
);
