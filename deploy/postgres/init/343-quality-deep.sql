-- ============================================================================
-- 健澜科技 jlmedaios — 【安全质量与运营】医院质量与安全管理深化指标表（M172-B）
--
-- 质量指标严格采用国家口径，不自创指标。依据《医疗质量管理办法》、
-- 《三级医院评审标准（2022 年版）》第四章「质量与安全」、国家卫生健康委
-- 《国家医疗质量安全改进目标》与《患者安全目标》，覆盖四大维度：
--
--   医疗质量：甲级病历率 / 手术并发症发生率 / 院感率 / 抗菌药物使用强度 / 术前讨论率
--   护理质量：基础护理合格率 / 危重护理合格率 / 压疮发生率 / 跌倒发生率
--   药事质量：处方合格率 / 医嘱合格率 / ADR 报告及时率 / 药品盘点差异率
--   患者安全：跌倒 / 坠床 / 压疮 / 给药错误 / 输血反应（目标零发生）
--
-- 一行 = 某科室某一期某一国家口径指标的实测读数；达标线（threshold）随指标
-- 字典维护，风险判定 / 趋势预测 / 改进建议全部由纯函数
-- src/bff/aggregators/qualityDeepAggregator.ts 完成，数据库不存业务结论。
--
-- 医疗安全红线：
--   * 患者安全不良事件 threshold=0 表示零容忍，任何阳性读数在聚合层计为红线；
--   * 本表只回读管理聚合量，不关联患者个体 PII；访问由 BFF 权限码控制；
--   * 指标字典（metric_code 白名单）由聚合器 QUALITY_METRIC_CATALOG 唯一约束，
--     禁止写入未登记国家口径指标。
--
-- 权限码：quality_deep:manage（质控岗录入与整改）、
--         quality_deep:view（管理驾驶舱只读）。
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- 质量指标维度枚举（与聚合器 QualityDomain 一一对应）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quality_domain_deep') THEN
    CREATE TYPE medmuse.quality_domain_deep AS ENUM ('medical', 'nursing', 'pharmacy', 'patient_safety');
  END IF;
END$$;

-- 质量指标方向枚举（与聚合器 MetricDirection 一一对应）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quality_metric_direction') THEN
    CREATE TYPE medmuse.quality_metric_direction AS ENUM ('lower_better', 'higher_better');
  END IF;
END$$;

-- 一行 = 某科室某一期某一国家口径质量指标实测读数
CREATE TABLE IF NOT EXISTS medmuse.quality_metric_deep (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 指标编码（国家口径白名单，如 MR_GRADE_A_RATE / PS_MEDICATION_ERROR）
  metric_code     text NOT NULL,
  -- 指标规范名（冗余便于直读，如「甲级病历率」）
  metric_name     text NOT NULL,
  -- 所属维度
  domain          medmuse.quality_domain_deep NOT NULL,
  -- 计量单位：% / ‰ / DDDs/100人天 / 例
  unit            text NOT NULL,
  -- 方向
  direction       medmuse.quality_metric_direction NOT NULL,
  -- 国家/行业达标线（higher_better：value>=threshold 达标；lower_better：value<=threshold 达标）
  threshold       numeric NOT NULL,

  -- 责任科室编码（如 IN / SU / NU），全院汇总行用 '__ALL__'
  dept            text NOT NULL,
  -- 统计期（自然月，如 2026-10）
  period          text NOT NULL,
  -- 本期实测值
  value           numeric NOT NULL,
  -- 样本量（出院人数 / 住院床日 / 抽查病历数等），可空
  sample_size     integer,

  -- 口径备注（分子/分母来源，便于审计回溯）
  caliber         text NOT NULL DEFAULT '',

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- 同一科室同一期同一指标唯一，避免重复录入
  CONSTRAINT uq_quality_metric_deep UNIQUE (metric_code, dept, period),
  -- 值非负
  CONSTRAINT chk_quality_metric_deep_value CHECK (value >= 0),
  CONSTRAINT chk_quality_metric_deep_threshold CHECK (threshold >= 0)
);

COMMENT ON TABLE medmuse.quality_metric_deep IS
  '【安全质量与运营】国家口径质量与安全指标实测读数（M172-B）：一行 = 某科室某期某指标';

-- 按科室 + 期间检索（质控科看板：本科室各期指标）
CREATE INDEX IF NOT EXISTS idx_quality_metric_deep_dept_period
  ON medmuse.quality_metric_deep(dept, period DESC);

-- 按指标 + 期间检索（全院趋势：某指标各期走势）
CREATE INDEX IF NOT EXISTS idx_quality_metric_deep_code_period
  ON medmuse.quality_metric_deep(metric_code, period DESC);

-- 按维度检索（驾驶舱分组：医疗/护理/药事/患者安全）
CREATE INDEX IF NOT EXISTS idx_quality_metric_deep_domain
  ON medmuse.quality_metric_deep(domain);

-- 仅回读管理视图，不暴露患者个体 PII；访问权限由 BFF 权限码
-- quality_deep:view / quality_deep:manage 控制。
