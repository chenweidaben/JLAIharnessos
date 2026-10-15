-- ============================================================================
-- 健澜科技 jlmedaios - 患者画像学习引擎（Patient Learning Profile）
--
-- 目的：以 patient_id 为主键，沉淀从历史就诊 / 医嘱 / 检验中结构化学习出的
--   患者长期画像——慢病清单、药物反应、偏好治疗方式、近期就诊摘要、风险标志。
--   每次 GET /api/v1/patients/:id/learning-profile 重新聚合后 UPSERT 覆盖写，
--   updated_at 即最近一次学习时间。
--
-- 隐私红线：本表只存结构化临床标签，严禁落患者姓名 / 身份证号等直接标识符；
--   patient_id 为院内脱敏主键，前端展示层仍需按就诊人授权关系二次校验。
--
-- 权限：medmuse:view（查看患者学习画像），仅授予医生 / 护士 / 药师 / 管理员。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

CREATE TABLE IF NOT EXISTS medmuse.patient_learning_profile (
  patient_id            text PRIMARY KEY,
  chronic_conditions    text[]        NOT NULL DEFAULT '{}',
  drug_reactions        text[]        NOT NULL DEFAULT '{}',
  preferred_treatment   text          NOT NULL DEFAULT '',
  recent_visits_summary text          NOT NULL DEFAULT '',
  risk_flags            text[]        NOT NULL DEFAULT '{}',
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

-- 按最近学习时间倒序，加速"长期未更新画像"巡检列表
CREATE INDEX IF NOT EXISTS idx_patient_learning_profile_updated
  ON medmuse.patient_learning_profile (updated_at DESC);

-- 权限字典（module 统一 medmuse）
INSERT INTO iam.permissions(code, name, module) VALUES
  ('medmuse:view', '患者学习画像查看', 'medmuse')
ON CONFLICT (code) DO NOTHING;

-- 角色授予：医生 / 护士 / 药师 / 管理员可查看；患者本人与 Agent 服务账号不授予
INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin',      'medmuse:view'),
  ('doctor',     'medmuse:view'),
  ('nurse',      'medmuse:view'),
  ('pharmacist', 'medmuse:view')
ON CONFLICT DO NOTHING;
