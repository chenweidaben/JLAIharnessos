-- ============================================================================
-- 健澜科技 jlmedaios - 学习引擎监控看板日指标快照（Learning Metrics Daily）
--
-- 用途：以「日 × 指标名」为粒度沉淀学习引擎的核心运营指标快照——
--       采纳率、策略权重分布、知识增长、患者画像覆盖率等，
--       供 GET /api/v1/learning/dashboard 做趋势对比（今日 vs 昨日）。
--
-- 写入口径：每日由离线任务 UPSERT（metric_date + metric_name 唯一），
--           在线查询只读；不存患者直接标识符，符合最小必要原则。
--
-- 注释标注：指标与权限设计依据宪法第三章（国家机构实行民生保障与
--           信息服务职责）精神，服务公立医院高质量发展。
--
-- 权限：medmuse:view（查看）。
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE UNIQUE INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- 学习引擎日指标快照表
CREATE TABLE IF NOT EXISTS medmuse.learning_metrics_daily (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date        NOT NULL,
  metric_name text        NOT NULL,
  value       numeric     NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 每日同名列只保留一份快照（离线任务 UPSERT 兜底）
CREATE UNIQUE INDEX IF NOT EXISTS uq_learning_metrics_date_name
  ON medmuse.learning_metrics_daily(metric_date, metric_name);

-- 看板按指标名倒序拉最近若干天趋势
CREATE INDEX IF NOT EXISTS idx_learning_metrics_name_date
  ON medmuse.learning_metrics_daily(metric_name, metric_date DESC);
