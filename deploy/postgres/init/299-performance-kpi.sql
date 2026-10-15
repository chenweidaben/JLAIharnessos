-- ============================================================================
-- 健澜科技 jlmedaios - M147-C 三级公立医院绩效考核（国考）指标结果表
--
-- 用途：按国家《三级公立医院绩效考核操作手册》最新版口径，沉淀医院在某一
--       考核周期（年/季）下 20 项核心国考指标的实际值、目标值与达标结论。
--
-- 指标四维 20 项（与国家国考「医疗质量 / 运营效率 / 持续发展 / 满意度评价」对齐）：
--   医疗质量 C1-C6：门诊出院比 / 四级手术比例 / 低风险组死亡率 /
--                   医疗服务收入占比 / 门诊基药处方占比 / 住院抗菌药物使用强度；
--   运营效率 C7-C12：平均住院日 / 术前平均住院日 / 门诊次均费用增幅 /
--                   住院次均费用增幅 / 资产负债率 / 人员支出占业务支出比；
--   持续发展 C13-C18：医护比 / 医师日均担负诊疗人次 / 科研成果转化金额 /
--                   带教导师数 / 住培合格率 / 高级职称医师占比；
--   满意度   C19-C20：门诊患者满意度 / 员工满意度。
--
-- 达标三色口径（应用层 hospitalKpiAggregator 判定，本表留痕 status）：
--   green  = 达标（实际达成目标）；
--   yellow = 待改进（达成率 90%~100%，方向修正即可）；
--   red    = 未达标（达成率 < 90%，需专项整改）。
--
-- 【知识图谱与患者教育】：国考指标结论可作为患者健康教育与出院随访的可解释
--   依据（如平均住院日、满意度），但本表只存聚合统计量，不存患者个体 PII。
--
-- 权限：kpi:view（仅 admin 可读国考看板）。
-- 幂等：CREATE SCHEMA / TABLE / INDEX IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 国考指标周期结果表（一个医院 × 一个周期 × 一个指标 = 一行）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.hospital_kpi (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     text        NOT NULL DEFAULT 'default',
  -- 考核周期标签，如 2026 / 2026-Q3，便于横向同比与环比
  period          text        NOT NULL,
  -- 指标编码 C1..C20，与 aggregator 内 KPI_CATALOG 严格对齐
  kpi_code        text        NOT NULL,
  kpi_name        text        NOT NULL,
  -- 维度：quality 医疗质量 / efficiency 运营效率 / development 持续发展 / satisfaction 满意度
  dimension       text        NOT NULL,
  -- 实际值 / 目标值（lower_is_better 时目标为上限阈值）
  actual_value    numeric     NOT NULL,
  target_value    numeric     NOT NULL,
  unit            text        NOT NULL DEFAULT '',
  -- higher_is_better 越大越好 / lower_is_better 越小越好
  direction       text        NOT NULL DEFAULT 'higher_is_better',
  -- green 达标 / yellow 待改进 / red 未达标
  status          text        NOT NULL DEFAULT 'yellow',
  -- 达成率（actual/target 或 target/actual，由方向决定），应用层计算后留痕
  achievement_rate double     NOT NULL DEFAULT 0,
  -- 样本量（该周期参与统计的出院/门诊/问卷基数），便于解释可信度
  sample_size     int         NOT NULL DEFAULT 0,
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, period, kpi_code)
);

-- 看板主力查询：某医院某周期全部指标（按维度 + 编码排序）
CREATE INDEX IF NOT EXISTS idx_hospital_kpi_hospital_period
  ON medmuse.hospital_kpi(hospital_id, period DESC, dimension, kpi_code);

-- 趋势对比：同一指标跨周期走势（院长看同比/环比）
CREATE INDEX IF NOT EXISTS idx_hospital_kpi_code_period
  ON medmuse.hospital_kpi(kpi_code, period DESC);

-- 权限：仅 admin 可读国考指标看板
INSERT INTO iam.permissions(code, name, module) VALUES
  ('kpi:view', '三级公立医院绩效考核-查看', 'system')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin', 'kpi:view')
ON CONFLICT DO NOTHING;
