-- ============================================================================
-- 健澜科技 jlmedaios - 医院绩效考核 · 个人绩效考评表（M140-A · 医院管理深化）
-- 271-performance-review.sql
--
-- 【医院管理深化】公平透明，每个得分都有依据。
--   本表沉淀每位员工每个账期（period，如 2026-10）的五维绩效考评快照：
--
--     工作量 30% / 医疗质量 25% / 患者满意度 20% / 学习成长 15% / 科室协作 10%
--
--   五维维度分均为 0-100（CHECK 锁死区间，杜绝越界分）；综合得分 = Σ 维度分 * 权重，
--   权重口径与 src/bff/aggregators/performanceReviewAggregator.ts 完全一致，
--   线上口径与单测口径同源，避免「系统算一套、手工算一套」。
--
-- 设计要点：
--   - evidence jsonb 留痕每个原始指标 → 基线 → 折算贡献的完整证据链，员工可申诉、
--     管理者可审计，真正做到「每一分都讲得清来源」。
--   - (staff_id, period) 唯一约束：同一人同一账期只留一条最新快照，重算即覆盖，
--     不会因重复考评产生双份排名。
--   - grade 用 CHECK 锁死 A/B/C/D 四档，口径全院一致。
--   - reviewed_at 用数据库时钟 now()，不采信前端自报时间，防止账期被篡改。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重复执行。
-- 不触碰 WebSocket，不新增依赖。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

CREATE TABLE IF NOT EXISTS clinical.performance_review (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id                   text NOT NULL,                    -- 员工工号
  staff_name                 text NOT NULL,                    -- 员工姓名（冗余展示，避免 join）
  dept_code                  text NOT NULL,                    -- 所属科室编码
  dept_name                  text NOT NULL,                    -- 所属科室名称
  period                     text NOT NULL,                    -- 考评账期，如 2026-10（YYYY-MM）

  -- 五维维度分（均 0-100，保留 1 位小数；权重 30/25/20/15/10）
  workload_score             numeric(5,1) NOT NULL CHECK (workload_score BETWEEN 0 AND 100),
  medical_quality_score       numeric(5,1) NOT NULL CHECK (medical_quality_score BETWEEN 0 AND 100),
  patient_satisfaction_score  numeric(5,1) NOT NULL CHECK (patient_satisfaction_score BETWEEN 0 AND 100),
  learning_growth_score      numeric(5,1) NOT NULL CHECK (learning_growth_score BETWEEN 0 AND 100),
  dept_collaboration_score   numeric(5,1) NOT NULL CHECK (dept_collaboration_score BETWEEN 0 AND 100),

  -- 综合得分 = Σ 维度分 * 权重；等级 ≥90 A / ≥80 B / ≥70 C / 其余 D
  total_score                numeric(5,1) NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  grade                      text NOT NULL CHECK (grade IN ('A','B','C','D')),

  -- 公平透明：每分依据留痕（原始指标 / 基线 / 方向 / 折算贡献），可申诉可审计
  evidence                   jsonb NOT NULL DEFAULT '[]'::jsonb,

  reviewed_at                timestamptz NOT NULL DEFAULT now(),  -- 考评时间（DB 时钟，防篡改）
  created_at                 timestamptz NOT NULL DEFAULT now(),

  -- 同一人同一账期只保留一条快照，重算覆盖
  UNIQUE (staff_id, period)
);

-- 按账期拉全院排名（院长按月看谁干得好）
CREATE INDEX IF NOT EXISTS idx_perf_review_period
  ON clinical.performance_review (period, total_score DESC);

-- 按账期 + 科室拉科室内部排名（科主任看自己团队）
CREATE INDEX IF NOT EXISTS idx_perf_review_period_dept
  ON clinical.performance_review (period, dept_code, total_score DESC);

-- 员工申诉：按工号查历史考评趋势
CREATE INDEX IF NOT EXISTS idx_perf_review_staff
  ON clinical.performance_review (staff_id, period DESC);
