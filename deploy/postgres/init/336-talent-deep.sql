-- ============================================================================
-- 健澜科技 jlmedaios — 【绩效与人才】医院人才管理深化：人才画像表（M166-B）
--
-- 设计原则：人才管理要发展人，不是监控人。
--   传统 HR 系统把员工档案当成「人事台账」，登完即止；本模块把每位员工的
--   技能 / 证书 / 培训 / 绩效 / 潜力沉淀为可生长的「人才画像」，驱动四件事：
--
--   人才画像 profile    技能集合 + 持证集合 + 在训/已训集合 + 近一年绩效 +
--                       潜力评估，JSONB 生长，不做固定列堆砌；
--   人才梯队 pipeline   按「绩效 60% + 潜力 40%」折算人才分，分四档
--                       successor_ready / backbone / backup / ordinary，
--                       看清谁是骨干、谁是后备、谁可继任——培养导向；
--   培训计划 training   技能缺口 → 课程映射（学什么/学时/优先级），
--                       缺口是培养方向，不是扣分项；
--   继任者 successor    关键岗位按「绩效+潜力+技能匹配」综合打分，
--                       排 ready / 1-2年 / 3年 三档就绪度，防关键岗断层。
--
-- 效果计算由纯函数 src/bff/aggregators/talentDeepAggregator.ts 完成：
--   buildTalentInventory / identifySkillGap / recommendTraining / identifySuccessor，
--   纯函数不触库、便于单测；数据库读写由路由层 routes/talentDeep.ts 负责。
--
-- 医疗安全红线：
--   * 本表为人力资源管理数据，不关联患者诊疗数据，不影响临床决策；
--   * 仅存工号/姓名/职称/画像聚合量，禁止存身份证号/手机号等敏感 PII；
--   * 绩效与潜力数据仅用于培养与继任规划，禁止用于末位淘汰式监控；
--   * 高潜员工识别结果（successor_ready）需经科室与人力资源部复核，
--     系统输出为辅助建议，不是晋升或淘汰决定。
--
-- 权限码：talent:manage（人力资源部维护画像与培训计划）、
--         talent:view（管理驾驶舱只读盘点）。
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- 人才梯队档位（与聚合器 TalentTier 对齐）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'talent_tier') THEN
    CREATE TYPE medmuse.talent_tier AS ENUM (
      'successor_ready',  -- 继任就绪：人才分 ≥85 且工龄 ≥5
      'backbone',         -- 科室骨干：人才分 ≥75
      'backup',           -- 后备力量：人才分 ≥60
      'ordinary'          -- 在岗胜任：常规发展路径
    );
  END IF;
END$$;

-- 一位员工 = 一行人才画像；四维画像以 JSONB 生长，不做固定列堆砌
CREATE TABLE IF NOT EXISTS medmuse.talent_profile (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基础人事（最小化 PII：只存工号/姓名/职称，不存身份证/手机号）
  staff_id          text NOT NULL,                 -- 员工工号（业务唯一键）
  staff_name        text NOT NULL DEFAULT '',      -- 姓名（演示/汇总用）
  dept_code         text NOT NULL DEFAULT '',      -- 科室编码
  title             text NOT NULL DEFAULT '',      -- 职称

  -- 【绩效与人才】四维画像
  skills            jsonb NOT NULL DEFAULT '[]'::jsonb,          -- 技能集合 ["冠心病介入",...]
  certificates      jsonb NOT NULL DEFAULT '[]'::jsonb,          -- 持证集合 ["执业医师资格证",...]
  completed_trainings jsonb NOT NULL DEFAULT '[]'::jsonb,        -- 已完成培训集合 ["科研方法学",...]

  -- 绩效与潜力（发展人：绩效与潜力并重，不是只看绩效排队）
  performance_score numeric(5,2) NOT NULL DEFAULT 0,        -- 近一年综合绩效 0-100
  potential_score   numeric(5,2) NOT NULL DEFAULT 0,        -- 发展潜力 0-100（360 校准）
  years_of_service  numeric(5,1) NOT NULL DEFAULT 0,        -- 本岗/本院工龄（年）

  -- 人才分与梯队（由聚合器折算后回写，便于报表直接查询；不写死为触发器）
  talent_score      numeric(5,1) NOT NULL DEFAULT 0,        -- 人才分 = 绩效×0.6 + 潜力×0.4
  talent_tier       medmuse.talent_tier NOT NULL DEFAULT 'ordinary',

  -- 最近一次盘点留痕
  last_review_at    timestamptz,
  note              text NOT NULL DEFAULT '',                -- 培养备注（脱敏文本）

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- 同一员工在全院唯一（工号即业务键）
  CONSTRAINT uq_talent_profile_staff UNIQUE (staff_id),
  -- 绩效/潜力限定在 0-100 区间，防止脏分
  CONSTRAINT chk_talent_profile_score CHECK (
    performance_score >= 0 AND performance_score <= 100
    AND potential_score >= 0 AND potential_score <= 100
  )
);

COMMENT ON TABLE medmuse.talent_profile IS
  '【绩效与人才】人才画像（M166-B）：一行 = 一位员工的技能/证书/培训/绩效/潜力生长档案，发展人不监控人';

-- 按科室盘点（管理驾驶舱：某科室人才分布）
CREATE INDEX IF NOT EXISTS idx_talent_profile_dept
  ON medmuse.talent_profile(dept_code);

-- 按梯队检索（继任/骨干盘点：找 successor_ready 候选人）
CREATE INDEX IF NOT EXISTS idx_talent_profile_tier
  ON medmuse.talent_profile(talent_tier);

-- 按人才分倒序（高潜优先列表）
CREATE INDEX IF NOT EXISTS idx_talent_profile_score
  ON medmuse.talent_profile(talent_score DESC);

-- 仅人力资源部（talent:manage）可写画像；管理驾驶舱（talent:view）只读盘点。
-- 本视图不暴露患者数据，与临床库物理隔离在 medmuse  schema 的人事域内。
