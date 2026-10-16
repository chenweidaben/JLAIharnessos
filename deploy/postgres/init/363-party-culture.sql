-- ============================================================================
-- 健澜科技 jlmedaios - 医院管理深化 · 党建与文化深化（M178-D）
--
-- 【财务人力行政党建】党建文化要务实，不能形式主义：
--   在 M140-D 党建工会活动留痕（clinical.party_activity）基础上，把"活动"
--   从"登记一场了事"升级为"可组织、可校验、可问效"：
--
--   管理四维度：
--     1) 党建工作：三会一课 / 主题党日 / 党员发展 / 组织关系
--     2) 工会工作：职工福利 / 文体活动 / 困难帮扶 / 职代会
--     3) 医德医风：医德考评 / 行风建设 / 投诉处理 / 先进表彰
--     4) 医院文化：院训院徽 / 医院精神 / 文化活动 / 品牌建设
--
--   反形式主义设计：
--     - agenda_notes 议程要点必填（不能只念标题、签到拍照就散会）；
--     - expected_attendees 应到人数 < 3 视为"一人讲众人听"，标记组织生活会流于形式；
--     - formal_risk_flags 记录形式主义风险点，action_items 记录议定落地事项，
--       会后是否办了，一查到底；
--     - 医德考评 medical_ethics_evaluation：查实违规一票否决等次，
--       不搞"人人优秀"的填表式考评；
--     - 医院文化活动 hospital_culture_event：人均成本、满意度留痕，
--       不搞"活动办了多少场"的虚功排名。
--
-- 幂等：重复执行不报错、不清空已有留痕。
-- 不触碰 WebSocket。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ----------------------------------------------------------------------------
-- 1) 扩展党建工会活动表：从"留痕"升级为"组织 + 反形式主义校验"
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.party_activity
  ADD COLUMN IF NOT EXISTS pillar           text,                 -- 管理维度：党建工作/工会工作/医德医风/医院文化
  ADD COLUMN IF NOT EXISTS theme_type       text,                 -- 子项：三会一课/主题党日/职工福利/医德考评/院训院徽...
  ADD COLUMN IF NOT EXISTS host_id          uuid,                 -- 主持人/责任人（= iam.users.id）
  ADD COLUMN IF NOT EXISTS expected_attendees integer DEFAULT 0,  -- 应到人数（反形式主义：<3 标记流于形式）
  ADD COLUMN IF NOT EXISTS budget           numeric(12,2) DEFAULT 0, -- 活动预算（元）
  ADD COLUMN IF NOT EXISTS agenda_notes     text DEFAULT '',      -- 议程要点（务实：不能空）
  ADD COLUMN IF NOT EXISTS formal_risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb, -- 形式主义风险提示
  ADD COLUMN IF NOT EXISTS action_items     jsonb NOT NULL DEFAULT '[]'::jsonb,  -- 议定落地事项
  ADD COLUMN IF NOT EXISTS org_status       text NOT NULL DEFAULT 'organized';   -- organized / needs_improvement

COMMENT ON COLUMN clinical.party_activity.pillar IS
  '【财务人力行政党建】管理四维度：党建工作/工会工作/医德医风/医院文化';
COMMENT ON COLUMN clinical.party_activity.expected_attendees IS
  '应到人数；<3 视为组织生活会流于形式（反形式主义硬校验）';
COMMENT ON COLUMN clinical.party_activity.agenda_notes IS
  '议程要点，必填且不得仅为标题（不能签到拍照就散会）';
COMMENT ON COLUMN clinical.party_activity.action_items IS
  '议定落地事项 jsonb，会后是否办了一查到底';

CREATE INDEX IF NOT EXISTS idx_party_activity_pillar_date
  ON clinical.party_activity (pillar, activity_date DESC);

-- ----------------------------------------------------------------------------
-- 2) 医德考评表：务实考评，查实违规一票否决
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.medical_ethics_evaluation (
  id                  uuid PRIMARY KEY,
  staff_id            uuid NOT NULL,                 -- 被考评职工（= iam.users.id）
  period              text NOT NULL,                 -- 考评周期，如 2026-H1 / 2026-Q3 / 2026
  -- 考评证据（来自投诉/表扬/培训/退红包等真实记录，不填表打分）
  complaints          integer NOT NULL DEFAULT 0 CHECK (complaints >= 0),           -- 有效投诉件数
  verified_violations integer NOT NULL DEFAULT 0 CHECK (verified_violations >= 0), -- 经查实违规（收红包/大处方等）
  commendations       integer NOT NULL DEFAULT 0 CHECK (commendations >= 0),        -- 表扬信/锦旗
  red_envelope_returned integer NOT NULL DEFAULT 0 CHECK (red_envelope_returned >= 0), -- 拒收/退回红包次数
  training_attended   integer NOT NULL DEFAULT 0 CHECK (training_attended >= 0),   -- 医德培训出勤
  training_required   integer NOT NULL DEFAULT 0 CHECK (training_required >= 0),   -- 医德培训应出勤
  score               integer NOT NULL DEFAULT 0,    -- 加权得分
  grade               text NOT NULL,                  -- A优秀/B良好/C合格/D不合格
  vetoed              boolean NOT NULL DEFAULT false, -- 查实违规一票否决
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, period)
);

COMMENT ON TABLE clinical.medical_ethics_evaluation IS
  '【财务人力行政党建】医德考评：以真实投诉/表扬/培训证据加权，查实违规一票否决，不搞人人优秀';
COMMENT ON COLUMN clinical.medical_ethics_evaluation.vetoed IS
  '经查实违规即一票否决，等次封顶为C（合格）';

CREATE INDEX IF NOT EXISTS idx_ethics_staff_period
  ON clinical.medical_ethics_evaluation (staff_id, period DESC);

-- ----------------------------------------------------------------------------
-- 3) 医院文化活动跟踪表：问效，不数场次
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.hospital_culture_event (
  id              uuid PRIMARY KEY,
  name            text NOT NULL,                 -- 活动名称
  category        text NOT NULL CHECK (category IN
                  ('院训院徽','医院精神','文化活动','品牌建设')),
  event_date      date NOT NULL,
  organizer       text NOT NULL DEFAULT '',
  planned_reach   integer NOT NULL DEFAULT 0 CHECK (planned_reach >= 0),  -- 计划覆盖人数
  actual_reach    integer NOT NULL DEFAULT 0 CHECK (actual_reach >= 0),   -- 实际覆盖人数
  budget          numeric(12,2) NOT NULL DEFAULT 0,   -- 预算（元）
  actual_spend    numeric(12,2) NOT NULL DEFAULT 0,   -- 实际花费（元）
  satisfaction    integer CHECK (satisfaction IS NULL OR (satisfaction BETWEEN 0 AND 100)), -- 满意度 0-100
  outcome_summary text NOT NULL DEFAULT '',      -- 成效小结（务实：办成了什么）
  status          text NOT NULL DEFAULT 'planned', -- planned / executing / closed
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.hospital_culture_event IS
  '【财务人力行政党建】医院文化活动跟踪：人均成本与满意度问效，不搞场次虚功排名';

CREATE INDEX IF NOT EXISTS idx_culture_event_date
  ON clinical.hospital_culture_event (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_culture_event_category
  ON clinical.hospital_culture_event (category, event_date DESC);
