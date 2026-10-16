-- ============================================================================
-- 健澜科技 jlmedaios — 【绩效与人才】医院科室绩效考核深化（M166-A）
--
-- 设计原则：绩效考核要公平，不能只看工作量。
--   传统考核把「门诊量 / 手术量 / 出院人数」当成唯一指挥棒，结果是大科室
--   天然占便宜、轻门诊重住院、压费用压服务；本模块把科室绩效拆成五个维度、
--   十三个可复算的指标，按权重合成百分制，工作量只占其中一格：
--
--     医疗质量 30%  甲级病历率 / 手术并发症率(反向) / 平均住院日(反向)
--     运营效率 20%  床位周转率 / 门诊量 / 手术量
--     患者满意 20%  总体满意度 / 投诉率(反向) / 表扬率
--     教学科研 15%  教学课时 / 论文数 / 课题数
--     成本控制 15%  次均费用(反向) / 药占比(反向) / 耗占比(反向)
--
--   每个指标都带 direction（越高越好 / 越低越好）与 target_value（目标值），
--   由纯函数 aggregators/performanceDeepAggregator.ts 归一化到 0-100：
--     越高越好：score = clamp(actual/target*100, 0, 120)
--     越低越好：score = clamp(target/actual*100, 0, 120)
--   样本量 sample_size 过小（< 阈值）时聚合器标记 underpowered，不凭小样本
--   给科室下定论，避免「抽查一个季度就定全年绩效」的不公平。
--
--   对标 benchmarkDepartment：用 hospital_avg / hospital_top_quartile
--   两个基准列回答「这个科在全院排第几」，而不是只看自己跟目标比；
--   差距识别 identifyPerformanceGap：列出低于目标的维度与指标，按缺口
--   大小排序，输出改进优先级，绩效结果直接对接人才培养与资源调配。
--
-- 医疗安全红线：
--   * 绩效结果为运营管理辅助，不与临床诊疗行为直接挂钩、不触发医嘱；
--   * 指标值均为科室聚合统计，不含患者姓名/身份证号等 PII；
--   * 反向指标（并发症率/投诉率/药占比）不得因「冲绩效」被瞒报，
--     聚合器对反向指标同样计入扣分，做假数据只会拉低成本控制分。
--
-- 权限码：performance:manage（绩效办核算与发布）、
--         performance:view（院领导/科主任只读）。
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- 指标方向：越高越好（率/量/满意度）或 越低越好（并发症/投诉/费用占比）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kpi_direction') THEN
    CREATE TYPE medmuse.kpi_direction AS ENUM (
      'higher_is_better',
      'lower_is_better'
    );
  END IF;
END$$;

-- 一条记录 = 某科室某季度某个指标的实际值 + 目标值 + 全院对标值。
-- 合成百分制与维度得分由纯函数聚合器完成，本表只存可追溯的事实数据。
CREATE TABLE IF NOT EXISTS medmuse.performance_kpi (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 科室与考核周期
  dept_code       text NOT NULL,                 -- 科室编码，如 internal_medicine / surgery
  dept_name       text NOT NULL DEFAULT '',      -- 科室中文名
  period_year     integer NOT NULL,              -- 考核年度，如 2026
  period_quarter   integer NOT NULL,              -- 考核季度 1..4

  -- 五维归类（与聚合器 DimensionCode 对齐）
  --   quality            医疗质量
  --   efficiency         运营效率
  --   satisfaction       患者满意
  --   teaching_research  教学科研
  --   cost_control       成本控制
  dimension       text NOT NULL,

  -- 单个指标（13 项）
  --   quality:            excellent_record_rate / surgery_complication_rate / avg_los
  --   efficiency:         bed_turnover / outpatient_volume / surgery_volume
  --   satisfaction:       overall_satisfaction / complaint_rate / praise_rate
  --   teaching_research:  teaching_hours / paper_count / grant_count
  --   cost_control:       avg_visit_cost / drug_ratio / consumable_ratio
  metric_code     text NOT NULL,
  metric_name     text NOT NULL,                 -- 中文指标名
  metric_value    numeric(12,2) NOT NULL,        -- 本季实际值
  target_value    numeric(12,2) NOT NULL,        -- 目标值（归一化基准）
  direction       medmuse.kpi_direction NOT NULL DEFAULT 'higher_is_better',
  unit            text NOT NULL DEFAULT '',      -- % / 次 / 天 / 课时 / 篇 / 项 / 元

  -- 对标基准（全院平均 / 全院前四分位），用于 benchmarkDepartment
  hospital_avg        numeric(12,2),
  hospital_top_quartile numeric(12,2),

  -- 样本量：季度覆盖人次/例数；过小则聚合器判 underpowered，不夸大结论
  sample_size     integer NOT NULL DEFAULT 0,

  -- 权重（维度内权重，维度间权重由聚合器常量控制），可留默认
  weight          numeric(6,4) NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- 基本合法性：周期季度合法、同一科室同周期同指标唯一
  CONSTRAINT chk_performance_kpi_quarter CHECK (period_quarter BETWEEN 1 AND 4),
  CONSTRAINT chk_performance_kpi_year    CHECK (period_year BETWEEN 2000 AND 2100),
  CONSTRAINT chk_performance_kpi_sample CHECK (sample_size >= 0)
);

-- 唯一约束：同科室同年同季同指标只允许一条事实记录（可 upsert 重算）
CREATE UNIQUE INDEX IF NOT EXISTS uq_performance_kpi_period_metric
  ON medmuse.performance_kpi(dept_code, period_year, period_quarter, metric_code);

-- 按科室 + 周期拉取（绩效办核算主查询）
CREATE INDEX IF NOT EXISTS idx_performance_kpi_dept_period
  ON medmuse.performance_kpi(dept_code, period_year, period_quarter DESC);

-- 按维度下钻（科主任看板：只看本质量/成本等单维）
CREATE INDEX IF NOT EXISTS idx_performance_kpi_dimension
  ON medmuse.performance_kpi(dept_code, dimension);

COMMENT ON TABLE medmuse.performance_kpi IS
  '【绩效与人才】科室绩效考核深化事实表（M166-A）：一行=某科室某季某指标实际/目标/对标值，五维十三项加权百分制，不只看工作量';

-- 仅回读绩效统计视图，不暴露患者个体 PII；访问权限由 BFF 权限码
-- performance:view / performance:manage 控制。
