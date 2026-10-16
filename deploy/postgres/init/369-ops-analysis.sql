-- ============================================================================
-- 健澜科技 jlmedaios - M180-B 医院运营分析深化（趋势/对标/预测）
-- 【质量与体验】
--   运营分析要有数据，不能拍脑袋。本脚本在 M172-C（344-ops-deep.sql）已落库的
--   medmuse.ops_metric 四域指标主表之上做扩展：
--     1. 新增趋势/预测/对标快照列：环比 mom_value、同比 yoy_value、线性回归预测值
--        forecast_value、预测置信度 forecast_confidence、全院对标排名 benchmark_rank，
--        供 BFF 纯函数聚合器（opsAnalysisAggregator）落库快照、跨期追溯；
--     2. 新增运营趋势汇总视图 v_ops_trend：把「科室 × 周期 × 指标」长表按指标展开，
--        便于 BI / 前端一次拉取多期曲线；
--     3. 新增预测落库表 ops_forecast：保存纯函数 predictOperationTrend 的未来 N 期
--        预测结果（含置信区间上下限），预测口径变更时整段重算，不覆盖历史实绩。
--
-- 生产红线：
--   - 仅运营管理处 / admin 可读写；比率类指标存 0..1 小数，金额 numeric 不取整；
--   - 全部 CREATE / ALTER ... IF NOT EXISTS，可重复执行；本脚本仅运营辅助，不触发诊疗。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 1. 扩展 ops_metric：趋势 / 预测 / 对标快照列（幂等）
-- ---------------------------------------------------------------------------
ALTER TABLE medmuse.ops_metric
  ADD COLUMN IF NOT EXISTS mom_value          numeric(16,2) NOT NULL DEFAULT 0,   -- 环比值（本期-上期）
  ADD COLUMN IF NOT EXISTS yoy_value          numeric(16,2) NOT NULL DEFAULT 0,   -- 同比值（本期-去年同期）
  ADD COLUMN IF NOT EXISTS forecast_value     numeric(16,2) NOT NULL DEFAULT 0,   -- 未来一期预测值（线性回归）
  ADD COLUMN IF NOT EXISTS forecast_confidence numeric(6,4) NOT NULL DEFAULT 0,   -- 预测置信度 R²，0..1
  ADD COLUMN IF NOT EXISTS benchmark_rank    int           NOT NULL DEFAULT 0;    -- 全院科室对标排名（1=最佳）

COMMENT ON COLUMN medmuse.ops_metric.mom_value           IS 'M180-B：环比变化值（本期-上期），由 BFF 纯函数算后回写';
COMMENT ON COLUMN medmuse.ops_metric.yoy_value           IS 'M180-B：同比变化值（本期-去年同期），数据不足时为 0';
COMMENT ON COLUMN medmuse.ops_metric.forecast_value      IS 'M180-B：未来一期预测值（最小二乘线性外推）';
COMMENT ON COLUMN medmuse.ops_metric.forecast_confidence IS 'M180-B：预测置信度（拟合优度 R²，0..1，越高越可信）';
COMMENT ON COLUMN medmuse.ops_metric.benchmark_rank      IS 'M180-B：全院科室对标排名（按指标方向归一后排序，1=最佳）';

-- 趋势查询常用：按科室 + 指标拉多期曲线
CREATE INDEX IF NOT EXISTS ops_metric_dept_metric_period_idx
  ON medmuse.ops_metric (dept_code, metric_key, period_key);

-- ---------------------------------------------------------------------------
-- 2. 运营趋势视图：科室 × 周期 × 指标 的最新一期实绩（供趋势/对标页直读）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW medmuse.v_ops_trend AS
SELECT
  dept_code,
  dept_name,
  period_type,
  period_key,
  domain,
  metric_key,
  metric_name,
  metric_value,
  unit,
  benchmark_value,
  target_value,
  mom_value,
  yoy_value,
  forecast_value,
  forecast_confidence,
  benchmark_rank,
  recorded_at
FROM medmuse.ops_metric;

COMMENT ON VIEW medmuse.v_ops_trend IS 'M180-B：运营趋势/对标/预测只读视图，长表结构，供 BI 与前端多期曲线拉取';

-- ---------------------------------------------------------------------------
-- 3. 预测落库表：未来 N 期预测快照（实绩不动，预测可整段重算）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.ops_forecast (
  id              bigserial PRIMARY KEY,
  dept_code       text        NOT NULL,                 -- 科室编码
  dept_name       text        NOT NULL DEFAULT '',      -- 科室名称（冗余）
  domain          text        NOT NULL,                 -- outpatient / inpatient / surgery / finance
  metric_key      text        NOT NULL,                 -- 指标键
  metric_name     text        NOT NULL,                 -- 指标中文名
  unit            text        NOT NULL DEFAULT '',      -- 单位
  anchor_period   text        NOT NULL,                 -- 预测锚点周期（如 2026-09）
  horizon         int         NOT NULL DEFAULT 1,       -- 预测第 N 期（1=下一期）
  target_period   text        NOT NULL,                 -- 被预测的周期（如 2026-10）
  forecast_value numeric(16,2) NOT NULL DEFAULT 0,     -- 预测值
  lower_bound     numeric(16,2) NOT NULL DEFAULT 0,    -- 95% 置信区间下限
  upper_bound     numeric(16,2) NOT NULL DEFAULT 0,    -- 95% 置信区间上限
  confidence      numeric(6,4) NOT NULL DEFAULT 0,     -- 拟合优度 R²
  method          text        NOT NULL DEFAULT 'linear_regression', -- 预测方法
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_forecast_domain_chk
    CHECK (domain IN ('outpatient','inpatient','surgery','finance')),
  CONSTRAINT ops_forecast_unique
    UNIQUE (dept_code, metric_key, target_period, anchor_period)
);

CREATE INDEX IF NOT EXISTS ops_forecast_dept_idx
  ON medmuse.ops_forecast (dept_code, target_period);
CREATE INDEX IF NOT EXISTS ops_forecast_metric_idx
  ON medmuse.ops_forecast (metric_key, target_period);

COMMENT ON TABLE medmuse.ops_forecast IS 'M180-B【质量与体验】：运营指标未来 N 期预测快照（线性回归 + 置信区间），实绩表不动，预测可整段重算';

-- ---------------------------------------------------------------------------
-- 权限：仅运营管理处 / admin 可读写（沿用 M172-C 口径，这里只声明视图可读）
-- ---------------------------------------------------------------------------
GRANT SELECT ON medmuse.v_ops_trend TO PUBLIC;
