-- ============================================================================
-- 健澜科技 jlmedaios · 管理驾驶舱 - 运营规律洞察（Operational Insight）
--
-- 依据宪法第四章：系统须「越用越懂运营规律」——在日常运营数据之上沉淀
-- AI 洞察卡片：
--   - 异常点：当前指标偏离历史均值 ±2σ 控制带（detectAnomaly）；
--   - 周期规律：同星期/同时段指标聚簇（周末效应、早晚高峰等）；
--   - 趋势：连续采样的线性走向（上升/下滑通道）。
-- 每条洞察由纯函数聚合器（src/bff/aggregators/operationalInsightAggregator.ts）
-- 离线/准实时产出后落库，管理驾驶舱只读拉取未确认卡片；
-- 运营确认后写 acknowledged_at，卡片归档不删除（审计留痕）。
--
-- 医疗安全红线：洞察仅为运营辅助提示，不触发任何诊疗行为、不直接改价/改排班；
--           所有建议动作须由运营人员人工确认后执行。
--
-- 权限码：medmuse:view（管理驾驶舱只读，admin/运营岗）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- 运营洞察卡片表：一行 = 一张 AI 异常/周期/趋势洞察卡片
CREATE TABLE IF NOT EXISTS medmuse.operational_insight (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_date    date NOT NULL,
  metric_name     text NOT NULL,
  current_value   numeric NOT NULL,
  expected_value  numeric NOT NULL,
  deviation_pct   numeric NOT NULL,
  ai_analysis     text NOT NULL,
  suggested_action text NOT NULL,
  acknowledged_at timestamptz
);

-- 驾驶舱按日期倒序拉取最新卡片
CREATE INDEX IF NOT EXISTS idx_operational_insight_date
  ON medmuse.operational_insight(insight_date DESC);

-- 未确认卡片工作集：acknowledged_at IS NULL 的行规模小，部分索引直扫
CREATE INDEX IF NOT EXISTS idx_operational_insight_pending
  ON medmuse.operational_insight(insight_date DESC)
  WHERE acknowledged_at IS NULL;

-- 按指标维度回看某指标的历史洞察序列
CREATE INDEX IF NOT EXISTS idx_operational_insight_metric
  ON medmuse.operational_insight(metric_name, insight_date DESC);
