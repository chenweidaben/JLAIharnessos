-- ============================================================================
-- 健澜科技 jlmedaios - 住院医生工作站「越用越懂患者」每日病情洞察
--   （依据宪法第四章：AI 原生医院以患者为中心，逐日沉淀病情演变记忆）
--
-- 表 medmuse.inpatient_daily_insight：
--   每个患者每次住院（visit_id）每日一行，由 BFF 聚合当日：
--     - key_events   jsonb：当日关键病情事件（体温波动 / 处置 / 手术 / 转归）
--     - risk_flags   jsonb：系统自动识别的风险标记（发热 / 低氧 / 危急值 / 停药…）
--     - ai_summary   text  ：面向住院医生的「今日重点关注」一段话总结
--   跨住院次数的既往反应合并（药物过敏 / 并发症 / 偏好）在聚合器内完成，
--   不另列表，避免与 medmuse 已有患者档案重复。
--
-- 医疗安全：本表为只读观察层，不直接驱动医嘱/治疗；ai_summary 必须经医生
--           阅改后方可进入正式病历。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- 住院每日病情洞察表（依据宪法第四章）
CREATE TABLE IF NOT EXISTS medmuse.inpatient_daily_insight (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  text NOT NULL,
  visit_id    text NOT NULL,
  insight_date date NOT NULL,
  key_events  jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_flags  jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_summary  text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 同一患者同一次住院同一天只允许一份洞察（重算即覆盖语义由聚合器保证）
CREATE UNIQUE INDEX IF NOT EXISTS uq_inpatient_daily_insight_visit_date
  ON medmuse.inpatient_daily_insight(visit_id, insight_date);

-- 按患者拉取历史洞察时间线（住院医生工作站「越用越懂患者」）
CREATE INDEX IF NOT EXISTS idx_inpatient_daily_insight_patient_date
  ON medmuse.inpatient_daily_insight(patient_id, insight_date DESC);
