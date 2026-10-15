-- ============================================================================
-- 健澜科技 jlmedaios — 【质量与合规】医院质量管理 PDCA 持续改进项目（M155-A）
--
-- 依据《医疗质量管理办法》第十八条、《三级医院评审标准（2022 年版）》
-- 第四章「质量与安全」：医院应运用 PDCA（Plan-Do-Check-Act）循环开展
-- 质量持续改进。本表落库一个个 PDCA 改进项目的全周期状态，而非填表留痕：
--
--   Plan  问题分析 + 量化目标设定 + 措施计划（plan_problem / plan_measures）
--   Do    措施实施与过程记录（do_records：逐条措施的执行证据/日期/责任人）
--   Check 效果评估 + before/after 数据对比（check_before / check_after）
--   Act   标准化输出 + 遗留问题转入下一循环（act_standardized / act_carryover）
--
-- 效果计算由纯函数 src/bff/aggregators/qualityPdcaAggregator.ts 完成：
-- 基于 before_rate / after_rate 与目标值，真实计算改善幅度、目标达成率与
-- verdict（达标 / 部分达标 / 未达标），不返回空壳结论。
--
-- 医疗安全红线：
--   * PDCA 项目为管理改进工具，不直接触发临床诊疗路径或医嘱；
--   * before/after 样本量过小（n<30）时聚合器标记 underpowered，不夸大结论；
--   * 遗留问题（carryover）必须显式转入下一循环，禁止静默丢弃。
--
-- 权限码：quality_pdca:manage（医务/质控岗新建与推进）、
--         quality_pdca:view（管理驾驶舱只读）。
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- PDCA 阶段枚举（与聚合器 PDCAPhase 一一对应，禁止数据库出现第五种取值）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pdca_phase') THEN
    CREATE TYPE medmuse.pdca_phase AS ENUM ('Plan', 'Do', 'Check', 'Act');
  END IF;
END$$;

-- 一个 PDCA 质量改进项目 = 一行；四阶段的过程证据以 JSONB 落库
CREATE TABLE IF NOT EXISTS medmuse.quality_improvement_project (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 项目基本信息
  name            text NOT NULL,
  dept            text NOT NULL,
  leader          text NOT NULL,

  -- 当前阶段（Plan→Do→Check→Act→Plan 下一循环）
  phase           medmuse.pdca_phase NOT NULL DEFAULT 'Plan',

  -- 量化目标：{ metric, unit, direction:'lower_better'|'higher_better',
  --            baseline, goal }，例如
  --   { metric:'住院跌倒发生率', unit:'‰', direction:'lower_better',
  --     baseline:4.2, goal:1.5 }
  target          jsonb NOT NULL,

  -- Plan：问题分析 + 措施计划
  plan_problem    text NOT NULL DEFAULT '',
  plan_measures   jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Do：措施实施记录 [{ measure, owner, executed_at, evidence }]
  do_records      jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Check：前后对比数据 { sample_size, rate }
  --   before 为改进前基线，after 为措施落地后复测
  check_before    jsonb,
  check_after     jsonb,

  -- Act：标准化输出清单 + 遗留问题（转入下一循环，不空转）
  act_standardized jsonb NOT NULL DEFAULT '[]'::jsonb,
  act_carryover   text NOT NULL DEFAULT '',

  -- 阶段流转轨迹 [{ phase, entered_at, note }]，可审计
  phase_history   jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- 闭环标记：Act 完成且无遗留问题时置 true
  closed          boolean NOT NULL DEFAULT false,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- 基本合法性：Plan 阶段必须已有问题描述
  CONSTRAINT chk_pdca_plan_problem CHECK (
    phase = 'Plan' OR length(trim(plan_problem)) > 0
  )
);

COMMENT ON TABLE medmuse.quality_improvement_project IS
  '【质量与合规】PDCA 质量持续改进项目（M155-A）：一行 = 一个改进项目全周期';

-- 按科室 + 当前阶段检索（质控科看板：本科室进行中项目）
CREATE INDEX IF NOT EXISTS idx_quality_pdca_dept_phase
  ON medmuse.quality_improvement_project(dept, phase);

-- 按更新时间倒序（管理驾驶舱最近活跃项目）
CREATE INDEX IF NOT EXISTS idx_quality_pdca_updated
  ON medmuse.quality_improvement_project(updated_at DESC);

-- 仅回读管理视图，不暴露患者个体 PII；访问权限由 BFF 权限码
-- quality_pdca:view / quality_pdca:manage 控制。
