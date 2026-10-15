-- ============================================================================
-- 健澜科技 jlmedaios - 患者满意度调查（M141-B）
-- 276-satisfaction.sql
--
-- 【质量与安全】匿名满意度调查：患者敢说真话。
--   - 不记录 patient_id 明文；仅存 visit_id 的 SHA-256 哈希（带盐），
--     报表侧无法反推到具体患者，也无法与挂号/就诊表联表定位个人；
--   - 六个维度：挂号便捷度 / 医生态度 / 护士态度 / 环境舒适度 / 等待时间 / 费用透明度；
--   - 评分 1-5（整数），自由留言可选；
--   - 一次就诊仅可提交一次（visit_id_hash 唯一索引）。
--
-- 与 M3-O 的 clinical.satisfaction_surveys（需登录、可定位患者）不同：
--   本表 clinical.satisfaction_survey（单数）是「匿名敢说话」通道，
--   面向患者离院后扫码填写，刻意不留身份字段。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

CREATE TABLE IF NOT EXISTS clinical.satisfaction_survey (
  -- 问卷记录主键（应用层 randomUUID）
  id                      uuid PRIMARY KEY,
  -- 【质量与安全】visit_id 的 SHA-256 哈希（带盐），不存 visit_id 明文、不存 patient_id
  visit_id_hash           text NOT NULL UNIQUE,
  -- 就诊科室编码（用于按科室切片分析；不绑定到具体医生/护士个人）
  dept_code               text NOT NULL DEFAULT '',
  -- 六维度评分（1-5 整数）
  registration_convenience integer NOT NULL CHECK (registration_convenience BETWEEN 1 AND 5),
  doctor_attitude          integer NOT NULL CHECK (doctor_attitude BETWEEN 1 AND 5),
  nurse_attitude           integer NOT NULL CHECK (nurse_attitude BETWEEN 1 AND 5),
  environment_comfort      integer NOT NULL CHECK (environment_comfort BETWEEN 1 AND 5),
  wait_time                integer NOT NULL CHECK (wait_time BETWEEN 1 AND 5),
  cost_transparency        integer NOT NULL CHECK (cost_transparency BETWEEN 1 AND 5),
  -- 自由留言（患者敢说真话的出口；应用层仍做敏感词过滤）
  comment                 text NOT NULL DEFAULT '',
  -- 提交时间（报告按月份切片）
  submitted_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.satisfaction_survey IS
  '【质量与安全】匿名患者满意度调查：仅存 visit_id 哈希，不存 patient_id 明文，患者敢说真话';
COMMENT ON COLUMN clinical.satisfaction_survey.visit_id_hash IS
  'visit_id 的 SHA-256 哈希（带应用层盐），不可反推患者身份';
COMMENT ON COLUMN clinical.satisfaction_survey.registration_convenience IS
  '维度：挂号便捷度（1-5）';
COMMENT ON COLUMN clinical.satisfaction_survey.doctor_attitude IS
  '维度：医生态度（1-5）';
COMMENT ON COLUMN clinical.satisfaction_survey.nurse_attitude IS
  '维度：护士态度（1-5）';
COMMENT ON COLUMN clinical.satisfaction_survey.environment_comfort IS
  '维度：环境舒适度（1-5）';
COMMENT ON COLUMN clinical.satisfaction_survey.wait_time IS
  '维度：等待时间（1-5）';
COMMENT ON COLUMN clinical.satisfaction_survey.cost_transparency IS
  '维度：费用透明度（1-5）';

-- 报告高频：按提交时间倒序拉当月问卷
CREATE INDEX IF NOT EXISTS idx_satisfaction_survey_submitted
  ON clinical.satisfaction_survey (submitted_at DESC);

-- 按科室 + 月份切片（管理员报告按 dept_code 过滤）
CREATE INDEX IF NOT EXISTS idx_satisfaction_survey_dept_submitted
  ON clinical.satisfaction_survey (dept_code, submitted_at DESC);
