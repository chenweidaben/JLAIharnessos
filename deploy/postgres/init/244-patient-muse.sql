-- ============================================================================
-- 健澜科技 jlmedaios · M117-A 患者 Personal Agent（Patient MUSE）健康画像表
--
-- 依据宪法第七章 7.7（患者 MUSE：为每一位患者沉淀「懂我病史与偏好」的个人健康助理）：
--   以 patient_id 为主键，为患者沉淀独立的、长期演进的健康画像——
--   慢性病标签（chronic_conditions）、用药过敏史（medication_allergies）、
--   就医偏好标签（preference_tags）与最近一次就诊摘要（last_visit_summary），
--   使医生端「一眼读懂这位患者」、患者端「只看得到自己的档案」。
--
-- 表结构：
--   medmuse.patient_health_profile
--     patient_id           text   主键（院内脱敏患者号，不落姓名 / 身份证号）
--     chronic_conditions   text[] 慢性病标签集合（如 高血压 / 2型糖尿病）
--     medication_allergies text[] 用药过敏史集合（药物名 / 过敏原）
--     preference_tags      text[] 就医偏好标签（如 慢病随访 / 偏好复诊门诊）
--     last_visit_summary   text   最近一次就诊脱敏摘要
--     updated_at           timestamptz 最近更新时间（默认 now()）
--
-- 医疗安全红线：
--   - 本表仅存「患者本人」的健康画像；医生端可读，患者端仅可读本人；
--   - 所有字段均为脱敏临床标签，严禁落患者姓名 / 身份证号 / 病案号明文；
--   - 画像由 BFF 纯聚合器 buildPatientMuse 从历史就诊 / 用药 / 回访派生，只读视图语义。
--
-- 幂等：CREATE SCHEMA / TABLE IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 患者健康画像（一人一行；由就诊 / 用药 / 回访数据持续回写）
-- 依据宪法第七章 7.7：患者个人健康档案与就医偏好
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.patient_health_profile (
  patient_id           text PRIMARY KEY,
  chronic_conditions   text[] NOT NULL DEFAULT '{}',
  medication_allergies text[] NOT NULL DEFAULT '{}',
  preference_tags      text[] NOT NULL DEFAULT '{}',
  last_visit_summary   text   NOT NULL DEFAULT '',
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- 按更新时间倒序拉取患者画像列表（医生端工作台最近更新优先）
CREATE INDEX IF NOT EXISTS idx_patient_health_profile_updated
  ON medmuse.patient_health_profile (updated_at DESC);
