-- ============================================================================
-- 健澜科技 jlmedaios — 【集团与科研】医学科研智能化：科研项目 AI 工作台（M156-C）
--
-- 面向集团科研处与临床研究者的「病例智能检索 → 自动统计分析 → 科研报告生成」
-- 闭环落库表：research_ai.research_project_ai。
--
-- 设计说明：
--   · 一行 = 一个科研项目的 AI 工作台会话快照：保存检索条件(criteria)、命中病例数、
--     统计分析结果(stats_result)与生成的科研报告(report_content)；
--   · 统计口径与 BFF 纯函数 researchAiAggregator 保持一致（描述性统计 /
--     Welch t 检验 / 卡方检验 / Kaplan-Meier 生存分析），落库仅留痕，不做计算；
--   · 本表可能聚合患者级脱敏数据，访问权限由 BFF 权限码 research:read /
--     research:write 控制，生产环境须配合数据脱敏与访问审计。
--
-- 幂等：CREATE SCHEMA / TABLE / INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS research_ai;

-- 科研项目 AI 工作台：一行 = 一个项目的检索-统计-报告会话快照
CREATE TABLE IF NOT EXISTS research_ai.research_project_ai (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 所属科研项目（关联 research 域项目号），业务侧用于按项目归集
  project_id           text NOT NULL,
  -- 项目名称（冗余快照，便于列表回显，不做外键约束）
  project_name         text,
  -- 研究疾病/专病关键词，如「肺腺癌」「2型糖尿病」
  disease              text,
  -- 智能检索条件快照：疾病+时间范围 / 年龄+性别 / 检查+检验指标 / 治疗方案+预后
  criteria             jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 本次检索命中的脱敏病例数
  matched_case_count   integer NOT NULL DEFAULT 0,
  -- 自动统计分析结果（描述性统计、t检验/卡方检验 p值、KM 曲线节点）
  stats_result         jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 自动生成的科研报告（摘要/结论/统计表格 Markdown）
  report_content       jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 报告状态：draft 草稿 / generated 已生成 / reviewed 已审阅
  report_status        text NOT NULL DEFAULT 'draft',
  -- 创建人（用户 id），审计留痕
  created_by           text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 按项目归集查询
CREATE INDEX IF NOT EXISTS idx_research_ai_project
  ON research_ai.research_project_ai (project_id);

-- 按疾病/专病检索历史
CREATE INDEX IF NOT EXISTS idx_research_ai_disease
  ON research_ai.research_project_ai (disease);

-- 按创建时间排查近期会话
CREATE INDEX IF NOT EXISTS idx_research_ai_created_at
  ON research_ai.research_project_ai (created_at DESC);

COMMENT ON TABLE research_ai.research_project_ai IS
  '【集团与科研】M156-C 科研项目 AI 工作台快照：病例智能检索/自动统计/报告生成';
