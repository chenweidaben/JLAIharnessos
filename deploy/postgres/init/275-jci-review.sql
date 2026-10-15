-- ============================================================================
-- 健澜科技 jlmedaios - 三甲评审准备系统 · 评审条款主表（M141-A · 质量与安全）
-- 275-jci-review.sql
--
-- 【质量与安全】以评促建，每条核心条款都有状态、有证据、有责任人。
--   本表沉淀三级医院评审七大类别下的核心条款（review_criterion）：
--
--     医院功能与任务 / 医疗质量安全管理 / 护理质量管理 / 药事管理 /
--     院感管理 / 病案管理 / 医院管理
--
--   状态三态（红黄绿，CHECK 锁死口径，全院一致）：
--     met       已达标（绿）
--     improving 待改进（黄，整改中、证据已留痕）
--     unmet     未达标（红，差距项，须列入整改计划）
--
-- 设计要点：
--   - status 用 CHECK 锁死 met/improving/unmet 三态，杜绝「基本达标」「差不多」
--     这类无法统计的模糊口径；红黄绿与 src/bff/aggregators/jciReviewAggregator.ts
--     的纯函数状态机完全同源。
--   - evidence jsonb 留痕每条条款的支撑材料（制度文件 / 会议纪要 / 监测数据 /
--     内审记录），评审专家现场可逐条调阅，做到「条款 - 证据」一一对应。
--   - owner_dept 责任到科室，priority 标注高 / 中 / 低，差距分析时按优先级排序。
--   - reviewed_at 用数据库时钟 now()，不采信前端自报时间，防止留痕日期被篡改。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重复执行。
-- 不触碰 WebSocket，不新增依赖。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

CREATE TABLE IF NOT EXISTS clinical.review_criterion (
  id             text PRIMARY KEY,                       -- 条款编号，如 MQ-01
  category       text NOT NULL CHECK (category IN (
                   'hospital_function',   -- 医院功能与任务
                   'medical_quality',     -- 医疗质量安全管理
                   'nursing_quality',     -- 护理质量管理
                   'pharmacy',            -- 药事管理
                   'infection_control',   -- 院感管理
                   'medical_records',     -- 病案管理
                   'hospital_admin'       -- 医院管理
                 )),
  code           text NOT NULL,                          -- 评审细则条款号，如「4.2.1」
  title          text NOT NULL,                          -- 条款标题
  description    text NOT NULL DEFAULT '',               -- 条款要求简述
  status         text NOT NULL DEFAULT 'unmet'
                 CHECK (status IN ('met','improving','unmet')),  -- 红黄绿三态
  owner_dept     text NOT NULL DEFAULT '',               -- 责任科室
  priority       text NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('high','medium','low')),
  evidence       jsonb NOT NULL DEFAULT '[]'::jsonb,      -- 支撑材料留痕
  reviewed_at    timestamptz NOT NULL DEFAULT now(),      -- 最近自评时间（DB 时钟）
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- 差距分析：按类别 + 状态统计（评审办按类别过堂）
CREATE INDEX IF NOT EXISTS idx_review_criterion_category_status
  ON clinical.review_criterion (category, status);

-- 整改清单：只捞未达标 / 待改进，按优先级排序
CREATE INDEX IF NOT EXISTS idx_review_criterion_priority
  ON clinical.review_criterion (priority, owner_dept)
  WHERE status <> 'met';
