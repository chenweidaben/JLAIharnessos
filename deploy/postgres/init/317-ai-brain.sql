-- ============================================================================
-- 健澜科技 jlmedaios — 【集团与科研】AI 医院大脑实时大屏快照表（M156-B）
--
-- 用途：为「AI 医院大脑实时大屏」提供落库快照。一次大屏轮询 = 一行
--   brain.ai_brain_metric，留存门诊 / 住院 / 手术 / 预警四类实时指标与 AI 建议，
--   供集团驾驶舱回看、科研趋势分析与大屏对账。
--
-- 【集团与科研】
--   · 集团视角：多院区共用一张表，通过 hospital_code 区分，便于集团横向对标；
--   · 科研视角：按 snapshot_minute 留存分钟级时序，可用于急诊峰谷预测、
--     床位周转与手术排程优化等课题的回顾性建模。
--
-- 当前 BFF 以「演示模式」生成数据（见 src/bff/aggregators/aiBrainAggregator.ts），
--   不直连真实 HIS / EMR / 手麻系统；表结构先行，后续平滑替换为实时聚合源，
--   字段语义不变。
--
-- 医疗安全红线：本表仅存科室 / 院区聚合计数，不含患者 PII；
--   访问权限由 BFF 权限码 brain:realtime:view 控制。
-- 幂等：CREATE SCHEMA / TABLE / INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS brain;

-- AI 医院大脑实时大屏快照：一行 = 一次大屏轮询的全量聚合
CREATE TABLE IF NOT EXISTS brain.ai_brain_metric (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 院区编码（集团多院区分院；单院演示默认 'HQ'）
  hospital_code       text NOT NULL DEFAULT 'HQ',
  -- 快照业务日期（YYYY-MM-DD，按医院本地日切）
  metric_date         date NOT NULL DEFAULT CURRENT_DATE,
  -- 快照分钟标签（YYYY-MM-DD HH:mm，分钟级时序用于科研趋势分析）
  snapshot_minute     timestamptz NOT NULL DEFAULT now(),

  -- 实时门诊量：在院候诊 / 今日挂号 / 今日就诊
  outpatient          jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 实时住院量：在院 / 今日入院 / 今日出院 / 床位使用率% / 核定床位
  inpatient           jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 实时手术：进行中 / 今日已完成 / 明日排程
  surgery             jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 实时预警：危急值待处理 / 院感预警 / 药品库存预警 / 设备故障
  warnings            jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- AI 建议（由 generateAIBrainSuggestion 产出）：优先级 / 标题 / 文案 / 处置动作
  suggestions         jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- 数据来源标记：demo 演示模式（当前） / live 实时聚合（后续替换）
  data_source         text NOT NULL DEFAULT 'demo',
  -- 落库时间（审计时序）
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- 按院区 + 日期回读当日大屏时序（集团驾驶舱当日曲线）
CREATE INDEX IF NOT EXISTS idx_ai_brain_hospital_date
  ON brain.ai_brain_metric(hospital_code, metric_date DESC);

-- 按分钟倒序回读最近快照（大屏轮询对账 / 科研分钟级序列）
CREATE INDEX IF NOT EXISTS idx_ai_brain_snapshot
  ON brain.ai_brain_metric(snapshot_minute DESC);

-- 按数据来源筛选（演示 / 实时分流统计）
CREATE INDEX IF NOT EXISTS idx_ai_brain_source
  ON brain.ai_brain_metric(data_source, created_at DESC);

-- 说明：本表仅存聚合计数，不含患者身份明细；批量导出与科研脱敏后数据集
--   须经数据治理流程审批，权限码 brain:realtime:view 控制读访问。
