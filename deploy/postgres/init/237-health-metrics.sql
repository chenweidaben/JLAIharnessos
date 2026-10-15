-- ============================================================================
-- 健澜科技 jlmedaios - 详细健康报告指标时序表（Health Metrics）
--
-- 用途：以「时间 × 指标名」为粒度沉淀 BFF 详细健康报告的核心运营指标——
--       错误率、慢查询条数、学习闭环反馈率、降级标记等，
--       供 GET /api/v1/health/detailed 与离线趋势巡检使用。
--
-- 写入口径：由运行时/巡检任务按时间点 INSERT；只存指标名与数值，
--           不存患者直接标识符、不存 SQL 文本与请求参数，符合最小必要原则。
--
-- 权限：medmuse:view（查看）。
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- 详细健康指标时序表
CREATE TABLE IF NOT EXISTS medmuse.health_metric (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name  text        NOT NULL,
  value        numeric     NOT NULL,
  recorded_at  timestamptz NOT NULL DEFAULT now()
);

-- 按指标名拉取最近若干时间点的健康趋势
CREATE INDEX IF NOT EXISTS idx_health_metric_name_recorded
  ON medmuse.health_metric(metric_name, recorded_at DESC);
