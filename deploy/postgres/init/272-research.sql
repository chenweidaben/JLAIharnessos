-- ============================================================================
-- 健澜科技 jlmedaios - 科研项目管理 · 项目台账表（M140-B · 医院管理深化）
-- 272-research.sql
--
-- 【医院管理深化】科研项目跟踪到结题，不能登记完就不管了。
--   本表记录医院每一项纵向/横向科研课题的全生命周期：
--
--   项目状态（status）闭环流转：
--     applying   申报中（登记入库，progress=0，等待立项）
--     active     进行中（progress>0 自动转入，按里程碑推进）
--     completed  已结题（progress=100，完成研究任务、提交结题材料）
--     accepted   已验收（结题后经科研管理部门/上级单位验收通过，闭环收口）
--
-- 设计要点：
--   - status 用 CHECK 约束锁死四态流转口径，任何越界状态在入库即失败，
--     保证科教科看到的项目阶段全院一致、可审计。
--   - progress 限制 0~100：应用层在 progress>=100 时自动收口为已结题，
--     杜绝「登记完就停在进行中」的僵尸课题。
--   - funding 一律非负（万元口径），dept 记录承担科室，支撑科研绩效分摊。
--   - start_date/end_date 用 CHECK(end_date >= start_date) 锁死工期合理性。
--   - milestones 用 jsonb 保存里程碑流水（名称 + 记录时间），可追溯每个节点。
--   - updated_at 由应用层在进度更新时刷新，不采信前端自报时间。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重复执行。
-- 不触碰 WebSocket，不新增依赖。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

CREATE TABLE IF NOT EXISTS clinical.research_project (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_no   text NOT NULL UNIQUE,                       -- 业务编号 P-YYYY-XXXX
  title        text NOT NULL,                              -- 课题名称
  leader_id    text NOT NULL,                              -- 课题负责人工号
  dept         text NOT NULL,                              -- 承担科室
  funding      numeric(14,2) NOT NULL DEFAULT 0 CHECK (funding >= 0),  -- 经费（万元）
  start_date   date NOT NULL,                              -- 计划开始
  end_date     date NOT NULL CHECK (end_date >= start_date),            -- 计划结束
  status       text NOT NULL CHECK (status IN
                 ('applying','active','completed','accepted')),           -- 四态闭环
  progress     integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100), -- 0~100
  milestone    text NOT NULL DEFAULT '',                   -- 当前里程碑
  milestones   jsonb NOT NULL DEFAULT '[]'::jsonb,         -- 里程碑流水
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 按状态筛选（科教科看「进行中/已结题/待验收」）
CREATE INDEX IF NOT EXISTS idx_research_project_status
  ON clinical.research_project (status, updated_at DESC);

-- 按承担科室汇总（科研绩效科室分摊）
CREATE INDEX IF NOT EXISTS idx_research_project_dept
  ON clinical.research_project (dept, status);

-- 按年度拉取科研报告（generateResearchReport）
CREATE INDEX IF NOT EXISTS idx_research_project_start_year
  ON clinical.research_project (start_date);
