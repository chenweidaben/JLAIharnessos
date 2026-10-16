-- ============================================================================
-- 健澜科技 jlmedaios — 【科研管理深化】科研项目全生命周期台账（M162-C）
--
-- 【医院全场景】科研管理要真实，不能凑数：
--   课题管理：国自然 / 省自然 / 院级 三档纵向课题全流程闭环；
--   论文管理：投稿 → 接收 → 发表 → 引用 四阶段留痕，引用数逐月回写；
--   成果转化：专利 / 软著 / 产品 三类转化产物，区分受理与授权/上线；
--   经费管理：预算 / 支出 / 结题审计三栏对照，支出不得超预算。
--
-- 设计要点：
--   · category 用 CHECK 锁死三档课题口径（nsfc 国自然 / provincial 省自然 /
--     institute 院级），杜绝「国自然、国家自然、国基金」混写；
--   · 经费 budget / spent 一律非负，且 CHECK(spent <= budget) 防止超支入库；
--   · papers / outputs / milestones 用 jsonb 留痕流水，阶段枚举在应用层
--     纯函数 trackProjectMilestone 中校验乱序与重复；
--   · impact_score 为冗余快照列，由 calculateResearchImpact 纯函数计算后回写，
--     不采信前端自报分数。
--
-- 幂等：CREATE SCHEMA / TABLE / INDEX IF NOT EXISTS，可重入。
-- 不触碰 WebSocket，不新增依赖。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS research;

-- ----------------------------------------------------------------------------
-- research_project_deep：一行 = 一个科研课题的全生命周期台账
--   （论文 / 成果转化 / 里程碑以 jsonb 流水挂在同一行，科研管理一屏可读）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research.research_project_deep (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 业务编号（如 NSFC-2026-001 / PROV-2026-014 / INST-2026-032）
  project_no      text NOT NULL UNIQUE,
  -- 课题名称
  title           text NOT NULL,
  -- 承担科室编码
  dept            text NOT NULL,
  -- 归属年度（立项年度）
  year            integer NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  -- 课题档次：nsfc 国自然 / provincial 省自然 / institute 院级
  category        text NOT NULL CHECK (category IN ('nsfc','provincial','institute')),
  -- 课题负责人姓名
  leader          text NOT NULL,
  -- 状态闭环：applying 申报中 / active 进行中 / completed 已结题 / accepted 已验收
  status          text NOT NULL CHECK (status IN
                    ('applying','active','completed','accepted')),
  -- 当前进度 0~100（由里程碑推进纯函数回写）
  progress        integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  -- 预算（万元）
  budget          numeric(14,2) NOT NULL DEFAULT 0 CHECK (budget >= 0),
  -- 已支出（万元），不得超预算
  spent           numeric(14,2) NOT NULL DEFAULT 0
                    CHECK (spent >= 0 AND spent <= budget),
  -- 结题审计结论：pending 未审 / passed 已通过 / issues 有问题
  audit_status    text NOT NULL DEFAULT 'pending' CHECK (audit_status IN
                    ('pending','passed','issues')),
  -- 里程碑流水：[{name, stage, recorded_at}]，stage ∈
  --  proposal 申报 / approval 立项 / midterm 中期检查 / closing 结题 / acceptance 验收
  milestones      jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 论文流水：[{title, journal, stage, citations}]，
  --   stage ∈ submitted 投稿 / accepted 接收 / published 发表 / cited 被引
  papers          jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 成果转化流水：[{name, kind, status}]，
  --   kind ∈ patent 专利 / software 软著 / product 产品；
  --   status ∈ filed 受理 / granted 授权 / online 上线
  outputs         jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 科研影响力得分快照（0~100），由 calculateResearchImpact 回写
  impact_score    numeric(5,2) NOT NULL DEFAULT 0
                    CHECK (impact_score BETWEEN 0 AND 100),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 按科室 + 年度拉取课题组合（科研管理页主查询）
CREATE INDEX IF NOT EXISTS idx_research_dept_year
  ON research.research_project_deep(dept, year, category);

-- 按状态筛「进行中 / 待验收」僵尸课题
CREATE INDEX IF NOT EXISTS idx_research_status
  ON research.research_project_deep(status, updated_at DESC);

-- 按年度汇总科研绩效
CREATE INDEX IF NOT EXISTS idx_research_year
  ON research.research_project_deep(year, status);
