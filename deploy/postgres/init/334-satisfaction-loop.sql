-- ============================================================================
-- 健澜科技 jlmedaios — 【CDSS与运营精细化】患者满意度与服务改进闭环（M165-C）
--
-- 设计原则：满意度闭环要真改进，不能只是登记投诉。
--   传统做法把投诉/满意度问卷当成「登记表」，收完即止；本模块把每一条
--   不满意信号（满意度低分 / 投诉 / 表扬）都驱动成一条可跟踪的改进事项，
--   走完 收集 → 分析 → 改进 → 验证 四步才算闭环：
--
--   收集 collect   满意度评分 + 投诉文本 + 表扬信号统一入库，不分通道；
--   分析 analyze   自动归类（等待/态度/费用/环境/沟通/流程/预约/疗效）、
--                  根因定位（人力/流程/设施/沟通/制度/资源/临床）、
--                  趋势识别（rising / stable / falling）；
--   改进 improve   生成改进措施 + 责任到人（owner）+ 限期（due_date），
--                  禁止「无人认领、无限期」的空改进；
--   验证 verify    改进后复查满意度（before_score → after_score），
--                  效果评定（resolved/improved/no_change/regressed），
--                  验证通过的措施标准化（standardized=true）沉淀为制度，
--                  未改善的自动回炉，进入下一轮循环，不静默丢弃。
--
-- 效果计算由纯函数 src/bff/aggregators/satisfactionLoopAggregator.ts 完成：
--   buildSatisfactionLoop / analyzeSatisfactionRootCause /
--   generateImprovementAction / trackImprovementEffect，
--   纯函数不触库、便于单测；数据库读写由路由层 routes/satisfactionLoop.ts 负责。
--
-- 医疗安全红线：
--   * 本闭环为运营改进工具，不直接触发临床诊疗路径或医嘱；
--   * issue_summary 仅存脱敏后的问题描述，不存患者姓名/手机号等 PII；
--   * 样本量过小（n<10）时聚合器标记 underpowered，不夸大改进结论；
--   * 验证未改善（regressed/no_change）的事项必须显式回炉，禁止归档了事。
--
-- 权限码：service_improvement:manage（客服/医务岗派单与复查）、
--         service_improvement:view（管理驾驶舱只读）。
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- 信号来源：满意度问卷 / 投诉 / 表扬（收集阶段三通道统一）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_issue_source') THEN
    CREATE TYPE medmuse.service_issue_source AS ENUM (
      'satisfaction_survey',
      'complaint',
      'praise'
    );
  END IF;
END$$;

-- 闭环状态机：collected → analyzed → improving → verified → closed
-- （verified 后效果不佳可回退 improving，由聚合器显式驱动，禁止跳跃归档）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_improvement_status') THEN
    CREATE TYPE medmuse.service_improvement_status AS ENUM (
      'collected',
      'analyzed',
      'improving',
      'verified',
      'closed'
    );
  END IF;
END$$;

-- 验证阶段效果评定（trackImprovementEffect 纯函数产出，落库留痕）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_effect_verdict') THEN
    CREATE TYPE medmuse.service_effect_verdict AS ENUM (
      'resolved',    -- 完全解决：复查均分 ≥4.5 且较基线提升 ≥1.0
      'improved',    -- 改善：较基线提升 ≥0.5
      'no_change',   -- 无变化：|Δ| < 0.5，回炉再分析
      'regressed'    -- 恶化：均分下降 ≥0.5，升级医务处督办
    );
  END IF;
END$$;

-- 一条不满意信号 = 一行改进事项；四阶段过程证据以 JSONB 落库
CREATE TABLE IF NOT EXISTS medmuse.service_improvement (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 收集阶段：三通道统一信号
  source          medmuse.service_issue_source NOT NULL DEFAULT 'satisfaction_survey',
  -- 问题摘要（脱敏文本，不含 PII）
  issue_summary   text NOT NULL,
  -- 归类：wait_time / staff_attitude / cost / environment / communication /
  --       process / appointment / treatment_effect（与聚合器 IssueCategory 对齐）
  category        text NOT NULL DEFAULT 'other',
  severity        text NOT NULL DEFAULT 'low',   -- high / medium / low
  -- 患者脱敏占位（如「门诊 P***」），禁止存真实姓名/手机号
  patient_hint    text NOT NULL DEFAULT '',

  -- 分析阶段：根因编码 + 趋势信号
  --   root_cause：staffing_gap / process_bottleneck / facility_aging /
  --               communication_gap / policy_unclear / resource_misconfig / clinical_quality
  root_cause      text NOT NULL DEFAULT '',
  trend_signal    text NOT NULL DEFAULT 'stable', -- rising / stable / falling

  -- 改进阶段：措施 + 责任到人 + 限期（缺一不可，禁止空改进）
  improvement_action text NOT NULL DEFAULT '',
  owner           text NOT NULL DEFAULT '',       -- 责任岗位/科室
  due_date        date,                            -- 限期完成日

  -- 验证阶段：改进前后满意度复查（1-5 分制）
  before_score    numeric(3,1),
  after_score     numeric(3,1),
  effect_verdict  medmuse.service_effect_verdict,
  verified_at     timestamptz,
  -- 验证通过的措施标准化为制度/流程后置 true，沉淀经验
  standardized    boolean NOT NULL DEFAULT false,

  -- 当前闭环状态
  status          medmuse.service_improvement_status NOT NULL DEFAULT 'collected',

  -- 阶段流转轨迹 [{ from, to, at, note }]，可审计、可回炉
  status_history  jsonb NOT NULL DEFAULT '[]'::jsonb,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- 基本合法性：进入 improving 前必须已有措施与责任人
  CONSTRAINT chk_service_improvement_action CHECK (
    status NOT IN ('improving', 'verified', 'closed')
    OR (length(trim(improvement_action)) > 0 AND length(trim(owner)) > 0)
  )
);

COMMENT ON TABLE medmuse.service_improvement IS
  '【CDSS与运营精细化】患者满意度与服务改进闭环（M165-C）：一行 = 一条信号驱动的改进事项，四阶段闭环，不收完即止';

-- 按状态检索（客服看板：进行中 improving / 待复查 verified）
CREATE INDEX IF NOT EXISTS idx_service_improvement_status
  ON medmuse.service_improvement(status);

-- 按类别 + 严重度检索（运营例会：高频高优问题下钻）
CREATE INDEX IF NOT EXISTS idx_service_improvement_category_severity
  ON medmuse.service_improvement(category, severity);

-- 按更新时间倒序（管理驾驶舱最近活跃事项）
CREATE INDEX IF NOT EXISTS idx_service_improvement_updated
  ON medmuse.service_improvement(updated_at DESC);

-- 仅回读运营管理视图，不暴露患者个体 PII；访问权限由 BFF 权限码
-- service_improvement:view / service_improvement:manage 控制。
