-- ============================================================================
-- 健澜科技 jlmedaios — 【质量与体验】医院质量与安全管理深化（M180-A）
--
-- 本表在 medmuse.quality_improvement_project（M155-A PDCA 改进项目）之上
-- 扩展「国家口径 + 评审证据链」字段，使一个改进项目不仅走完 PDCA 四阶段，
-- 还能挂到国家考核与三甲评审条款上，做到「改进即备检、整改即闭环」。
--
-- 质量管理严格采用国家口径，不自创指标：
--
--   医疗质量：
--     · 三级公立医院绩效考核（国办发〔2019〕4 号）国家监测指标；
--     · 电子病历系统功能应用水平分级评价（国家卫生健康委）五级要求；
--     · 医院信息互联互通标准化成熟度测评 四级甲等（互联互通四甲）。
--   患者安全：
--     · 中国医院协会《患者安全目标》十大安全目标；
--     · 医疗质量安全不良事件上报（《医疗质量管理办法》第二十三、二十四条）；
--     · 根因分析 RCA（为什么会错，而不是谁错了）。
--   质量改进方法论：
--     · PDCA 循环 / 品管圈 QCC / 六西格玛 DMAIC / 精益 Lean 消除浪费。
--   评审准备：
--     · 《三级医院评审标准（2022 年版）》第四章质量与安全条款；
--     · 条款编号 + 证据链 + 差距分析 + 整改跟踪四件套。
--
-- 红线：
--   * 患者安全不良事件目标零容忍（target.threshold=0），阳性即红线；
--   * 证据链只回读管理聚合量，不关联患者个体 PII；访问由 BFF 权限码控制；
--   * 改进效果数学全部在纯函数 src/bff/aggregators/qualitySafetyAggregator.ts
--     完成，数据库不存业务结论（达标/差距/优先级）。
--
-- 权限码：quality_safety:manage（质控岗录入与整改）、
--         quality_safety:view（管理驾驶舱只读）。
-- 幂等：ALTER TABLE ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- 质量与安全四大管理维度（与聚合器 QualitySafetyDimension 一一对应）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quality_safety_dim') THEN
    CREATE TYPE medmuse.quality_safety_dim AS ENUM (
      'medical_quality',      -- 医疗质量：国考指标 / 电子病历五级 / 互联互通四甲
      'patient_safety',       -- 患者安全：十大目标 / 不良事件 / 根因分析
      'quality_improvement',  -- 质量改进：PDCA / 品管圈 / 六西格玛 / 精益
      'review_readiness'      -- 评审准备：三甲条款 / 证据链 / 差距 / 整改跟踪
    );
  END IF;
END$$;

-- 质量改进方法论枚举（与聚合器 ImprovementMethod 一一对应）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'improvement_method') THEN
    CREATE TYPE medmuse.improvement_method AS ENUM (
      'PDCA',        -- 计划-执行-检查-处理
      'QCC',         -- 品管圈
      'DMAIC',       -- 六西格玛 Define-Measure-Analyze-Improve-Control
      'LEAN'         -- 精益管理（消除浪费）
    );
  END IF;
END$$;

-- 差距 / 整改等级枚举（与聚合器 GapSeverity 一一对应）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quality_gap_severity') THEN
    CREATE TYPE medmuse.quality_gap_severity AS ENUM (
      'red',     -- 红线：患者安全零容忍 / 国考核心指标严重不达标
      'yellow',  -- 黄线：低于国家达标线，需限期整改
      'green'    -- 绿线：达标或优于标准
    );
  END IF;
END$$;

-- ----------------------------------------------------------------------------
-- 扩展 M155-A 的 PDCA 改进项目表：挂国家口径与评审证据链
-- ----------------------------------------------------------------------------
ALTER TABLE medmuse.quality_improvement_project
  ADD COLUMN IF NOT EXISTS safety_dim        medmuse.quality_safety_dim,
  ADD COLUMN IF NOT EXISTS improvement_method medmuse.improvement_method NOT NULL DEFAULT 'PDCA',
  ADD COLUMN IF NOT EXISTS gap_severity      medmuse.quality_gap_severity NOT NULL DEFAULT 'green',

  -- 对应国家考核 / 评审口径（自由文本编号，如「国考·四级手术占比」「评审·4.3.1.2」
  -- 「电子病历五级·CDSS」「互联互通四甲·平台交互」「患者安全目标·识别患者身份」）
  ADD COLUMN IF NOT EXISTS national_clause   text NOT NULL DEFAULT '',

  -- 十大患者安全目标编号（1~10），患者安全维度必填，其余维度为空
  ADD COLUMN IF NOT EXISTS patient_safety_target integer,

  -- 证据链：[{ evidence_no, title, source, collected_at, keeper }]
  -- 评审迎检时按条款调阅；数据库只存管理台账，不存病历原文 / PII
  ADD COLUMN IF NOT EXISTS evidence_chain   jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- 根因分析结论（RCA：人/机/料/法/环/测，5Why 落点）
  ADD COLUMN IF NOT EXISTS root_cause       text NOT NULL DEFAULT '',

  -- 整改跟踪：{ assigned_to, deadline, status:'pending'|'doing'|'done', verified_by }
  ADD COLUMN IF NOT EXISTS rectification    jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 患者安全维度必须挂十大目标之一（1~10），不允许空挂
ALTER TABLE medmuse.quality_improvement_project
  DROP CONSTRAINT IF EXISTS chk_qsp_patient_safety_target;
ALTER TABLE medmuse.quality_improvement_project
  ADD CONSTRAINT chk_qsp_patient_safety_target CHECK (
    safety_dim IS DISTINCT FROM 'patient_safety'
    OR (patient_safety_target >= 1 AND patient_safety_target <= 10)
  );

COMMENT ON TABLE medmuse.quality_improvement_project IS
  '【质量与体验】质量改进项目（M155-A PDCA + M180-A 国家口径/评审证据链扩展）';

-- 按管理维度检索（质控科看板：患者安全类项目单独盯）
CREATE INDEX IF NOT EXISTS idx_qsp_safety_dim
  ON medmuse.quality_improvement_project(safety_dim);

-- 按差距等级检索（迎检准备：红黄线项目优先排整改）
CREATE INDEX IF NOT EXISTS idx_qsp_gap_severity
  ON medmuse.quality_improvement_project(gap_severity)
  WHERE gap_severity IS DISTINCT FROM 'green';

-- 按整改期限检索（到期未整改预警）
CREATE INDEX IF NOT EXISTS idx_qsp_rectification_deadline
  ON medmuse.quality_improvement_project((rectification->>'deadline'));

-- 仅回读管理视图，不暴露患者个体 PII；访问权限由 BFF 权限码
-- quality_safety:view / quality_safety:manage 控制。
