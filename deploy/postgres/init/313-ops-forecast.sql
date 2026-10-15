-- ============================================================================
-- 健澜科技 jlmedaios — 【AI深化与运营预测】医院运营智能预测（M154-C）
--
-- 依据宪法第四章「越用越懂运营规律」：在门诊量 / 床位负荷 / 手术量三类
-- 运营时间序列之上，由纯函数聚合器（src/bff/aggregators/opsForecastAggregator.ts）
-- 采用「移动平均去趋势 + 星期季节因子 + 趋势线性外推」产出未来 N 天预测，
-- 并基于历史拟合残差标准差给出 95% 预测置信区间（lower / upper），不拍脑袋。
--
-- 本表落库最近一次预测结果：一行 = 某指标某预测日的一个预测点，
-- 供管理驾驶舱 GET /api/v1/admin/forecast 回读展示；重跑即覆盖写（按
-- metric_name + forecast_date upsert），不做历史预测归档（归档走离线数仓）。
--
-- 医疗安全红线：预测仅为运营排班/物资准备辅助参考，不触发任何诊疗行为、
--   不直接调号源/调床位；所有资源调度须由运营人员人工确认后执行。
-- 降级原则：历史样本不足（<14 天）时聚合器返回 degraded 空集，不入库、不编造。
-- 权限码：medmuse:view（管理驾驶舱只读，admin/运营岗）。
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- 运营预测结果表：一行 = 某指标某预测日的一个预测点（含置信区间）
CREATE TABLE IF NOT EXISTS medmuse.ops_forecast (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 被预测的日期（自然日，yyyy-mm-dd）
  forecast_date     date NOT NULL,
  -- 指标：outpatient_volume 门诊量 / bed_occupancy 床位负荷 / surgery_volume 手术量
  metric_name       text NOT NULL,
  -- 点预测值（移动平均×季节因子×趋势外推）
  predicted_value   numeric NOT NULL,
  -- 95% 预测置信区间下界（历史残差 ±1.96σ，按预测步长膨胀）
  lower_bound       numeric NOT NULL,
  -- 95% 预测置信区间上界
  upper_bound       numeric NOT NULL,
  -- 本次拟合所用历史残差标准差（可解释区间宽度来源）
  residual_std      numeric NOT NULL,
  -- 置信水平（固定 0.95）
  confidence_level  numeric NOT NULL DEFAULT 0.95,
  -- 参与拟合的历史样本天数（<14 天不产预测，降级空集）
  history_points    integer NOT NULL,
  -- 模型方法说明（如 'ma7+seasonal7d+lin_trend'）
  model_method      text NOT NULL,
  -- 预测生成时间（整批写入的时间戳，用于回读最近一批）
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (metric_name, forecast_date)
);

-- 管理驾驶舱按指标+日期倒序回读最新一批预测
CREATE INDEX IF NOT EXISTS idx_ops_forecast_metric_date
  ON medmuse.ops_forecast(metric_name, forecast_date DESC);

-- 按生成时间回读最近一批预测（重跑覆盖后清理旧批用）
CREATE INDEX IF NOT EXISTS idx_ops_forecast_created
  ON medmuse.ops_forecast(created_at DESC);

-- 预测回读仅聚合统计量，不暴露患者个体 PII；访问权限由 BFF 权限码 medmuse:view 控制。
