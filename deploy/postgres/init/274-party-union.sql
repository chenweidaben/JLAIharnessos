-- ============================================================================
-- 健澜科技 jlmedaios - 医院管理深化 · 党建工会活动留痕（M140-D）
--
-- 【医院管理深化】党建工会管理：党支部学习 / 主题党日 / 工会福利 / 职工文体 / 志愿服务。
--   核心诉求是「活动留痕，方便上级检查」：每一场活动的类型、主题、组织者、
--   时间、地点、参与人员全部落库，谁办的、谁参加的、什么时候办的，一查到底。
--
-- 设计要点：
--   - type 直接存中文活动类型（党支部学习/主题党日/工会福利/职工文体/志愿服务），
--     上级检查时无需翻译对照，所见即所查；
--   - participants 为 jsonb 字符串数组（参与人员名单），participant_count 为冗余
--     计数，年度报告按类型/按月统计时免解析数组；
--   - activity_date 为活动实际发生日期（YYYY-MM-DD），年度报告按此切片；
--   - organizer_id 为 iam.users.id，组织责任可溯。
--
-- 幂等：重复执行不会报错、不会清空已有活动留痕。
-- 不触碰 WebSocket：本版仅做拉取式 REST。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

CREATE TABLE IF NOT EXISTS clinical.party_activity (
  id                uuid PRIMARY KEY,
  -- 活动类型：党支部学习 / 主题党日 / 工会福利 / 职工文体 / 志愿服务
  type              text NOT NULL CHECK (type IN
                      ('党支部学习','主题党日','工会福利','职工文体','志愿服务')),
  -- 活动主题标题
  title             text NOT NULL,
  -- 组织者（= iam.users.id），组织责任留痕
  organizer_id      uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
  -- 活动实际发生日期（年度报告按此切片）
  activity_date     date NOT NULL,
  -- 活动地点
  location          text NOT NULL DEFAULT '',
  -- 参与人员留痕名单：["张三","李四", ...]
  participants      jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 参与人次冗余计数（= participants 数组长度），报表免解析
  participant_count integer NOT NULL DEFAULT 0 CHECK (participant_count >= 0),
  -- 登记时间（系统留痕，与活动日期区分）
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.party_activity IS
  '【医院管理深化】党建工会活动留痕（党支部学习/主题党日/工会福利/职工文体/志愿服务），方便上级检查';
COMMENT ON COLUMN clinical.party_activity.participants IS
  '参与人员留痕名单（jsonb 数组），谁参加的可溯';
COMMENT ON COLUMN clinical.party_activity.activity_date IS
  '活动实际发生日期；年度报告按年份切片统计';

-- 上级检查高频：按活动日期倒序拉全部留痕
CREATE INDEX IF NOT EXISTS idx_party_activity_date
  ON clinical.party_activity (activity_date DESC);

-- 按类型 + 日期倒序（分类型台账，如「主题党日」专项检查）
CREATE INDEX IF NOT EXISTS idx_party_activity_type_date
  ON clinical.party_activity (type, activity_date DESC);

-- 年度报告：按年份区间扫描（activity_date 范围条件走索引）
CREATE INDEX IF NOT EXISTS idx_party_activity_organizer
  ON clinical.party_activity (organizer_id, activity_date DESC);
