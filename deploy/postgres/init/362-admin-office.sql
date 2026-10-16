-- ============================================================================
-- 健澜科技 jlmedaios - 医院行政办公深化（M178-C）【财务人力行政党建】
--
-- 【业务目标】行政办公要高效，不能踢皮球。
--   在 267-oa-approvals.sql 的「请假/报销/采购/用印」多级审批基础上，把行政办公
--   从「四类审批单」深化为四个可闭环的办公域：
--
--   1. 公文管理 oa_document：发文 / 收文 / 审批 / 归档 全流程留痕，来文有登记、
--      办文有节点、办结有归档，杜绝「公文满天飞、谁都不接」；
--   2. 会议管理 oa_meeting：会议申请 + 会议室预订 + 会议纪要，时间/会议室/参会人
--      三方不冲突，纪要跟决议，决议跟责任人；
--   3. 档案管理 oa_archive：文书档案 / 科技档案 / 会计档案 三类分库存放，
--      归档编号唯一、保管期限明确；
--   4. 督查督办 oa_supervision_task：任务下达 + 进度跟踪 + 办结反馈，
--      任务有 owner、有期限、有进度、有超期自动升级，不允许「踢皮球无人牵头」。
--
-- 设计要点：
--   - 全部 CREATE TABLE IF NOT EXISTS，幂等可重复执行；
--   - 业务规则（审批流转 / 会议冲突 / 督办超期升级）收敛在 BFF 纯函数聚合器
--     （src/bff/aggregators/officeDeepAggregator.ts），本文件只落结构与索引；
--   - 不触碰 WebSocket；不写存储过程；老数据不迁移也能跑。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ----------------------------------------------------------------------------
-- 域①公文管理：oa_document（发文 + 收文 + 审批 + 归档）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.oa_document (
  id              uuid PRIMARY KEY,
  doc_no          text,                                   -- 发文字号（如 健澜政〔2026〕12 号）
  title           text NOT NULL,
  -- 行文方向：outgoing 发文 / incoming 收文
  direction       text NOT NULL CHECK (direction IN ('outgoing','incoming')),
  -- 文种：notice通知 / report报告 / request请示 / reply批复 / letter函 / minute纪要
  category        text NOT NULL DEFAULT 'notice'
                    CHECK (category IN ('notice','report','request','reply','letter','minute')),
  applicant_id   uuid REFERENCES iam.users(id) ON DELETE SET NULL,
  dept_code       text NOT NULL DEFAULT '',
  -- 公文状态：draft拟稿 / pending审批中 / approved已签发 / rejected已退回 / archived已归档
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','pending','approved','rejected','archived')),
  -- 审批节点留痕：[{order,role,approverId,action,comment,actedAt}]
  approval_steps  jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_step    integer NOT NULL DEFAULT 0 CHECK (current_step >= 0),
  -- 收文登记号（仅 incoming）
  receipt_no      text,
  -- 归档信息
  archive_id      uuid,
  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.oa_document IS
  '行政公文：发文/收文全流程，审批节点留痕，办结后归档；来文必登记、办文有节点';
COMMENT ON COLUMN clinical.oa_document.approval_steps IS
  '审批节点留痕数组：每节点含 order/role/approverId/action/comment/actedAt，谁签的、签了啥可追溯';
COMMENT ON COLUMN clinical.oa_document.current_step IS
  '下一待办节点下标；等于 approval_steps 长度表示审批已走完';

-- 文号唯一：同一发文字号不能重复（发文重号是公文管理大忌）
CREATE UNIQUE INDEX IF NOT EXISTS idx_oa_document_doc_no
  ON clinical.oa_document (doc_no)
  WHERE doc_no IS NOT NULL;

-- 待办公文查询：办公室按当前节点拉待办
CREATE INDEX IF NOT EXISTS idx_oa_document_pending
  ON clinical.oa_document (status, current_step)
  WHERE status = 'pending';

-- ----------------------------------------------------------------------------
-- 域②会议管理：oa_meeting（会议申请 + 会议室预订 + 会议纪要）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.oa_meeting (
  id            uuid PRIMARY KEY,
  title         text NOT NULL,
  requester_id  uuid REFERENCES iam.users(id) ON DELETE SET NULL,
  requester_dept text NOT NULL DEFAULT '',
  room          text NOT NULL,                       -- 会议室（如 行政楼301）
  start_at      timestamptz NOT NULL,
  end_at        timestamptz NOT NULL CHECK (end_at > start_at),
  attendees     integer NOT NULL DEFAULT 0 CHECK (attendees >= 0),
  -- 状态：requested已申请 / booked已预订 / conflict冲突 / cancelled已取消 / done已开完
  status        text NOT NULL DEFAULT 'requested'
                  CHECK (status IN ('requested','booked','conflict','cancelled','done')),
  -- 会议纪要（开完填写）
  minutes       text NOT NULL DEFAULT '',
  decisions     jsonb NOT NULL DEFAULT '[]'::jsonb,    -- 决议 [{item, owner, dueDate}]
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.oa_meeting IS
  '会议管理：会议室按时段预订，时间/会议室/参会人三方不冲突；纪要跟决议，决议跟责任人';
COMMENT ON COLUMN clinical.oa_meeting.decisions IS
  '会议决议数组：[{item决议事项, owner责任人, dueDate期限}]，会后自动转督办任务';

-- 会议室时段冲突检测：按 room + 时间范围扫已预订会议
CREATE INDEX IF NOT EXISTS idx_oa_meeting_room_time
  ON clinical.oa_meeting (room, start_at, end_at)
  WHERE status IN ('booked','requested');

-- ----------------------------------------------------------------------------
-- 域③档案管理：oa_archive（文书档案 + 科技档案 + 会计档案）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.oa_archive (
  id            uuid PRIMARY KEY,
  archive_no    text NOT NULL,                       -- 归档编号（全宗-年度-类目-件号）
  title         text NOT NULL,
  -- 档案类目：文书文书档案 / 科技科技档案 / 会计会计档案
  category      text NOT NULL CHECK (category IN ('wen_shu','ke_ji','kuai_ji')),
  source_doc_id uuid REFERENCES clinical.oa_document(id) ON DELETE SET NULL,
  keeper_dept   text NOT NULL DEFAULT '',            -- 保管部门
  -- 保管期限：永久 / 30年 / 10年
  retention     text NOT NULL DEFAULT '30y'
                  CHECK (retention IN ('permanent','30y','10y')),
  archived_at   timestamptz NOT NULL DEFAULT now(),
  destroy_date  date,                                -- 到期销毁日（保管期限满）
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.oa_archive IS
  '档案管理：文书/科技/会计三类分库，归档编号唯一，保管期限明确，到期提醒销毁';

CREATE UNIQUE INDEX IF NOT EXISTS idx_oa_archive_no
  ON clinical.oa_archive (archive_no);

CREATE INDEX IF NOT EXISTS idx_oa_archive_destroy
  ON clinical.oa_archive (destroy_date)
  WHERE destroy_date IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 域④督查督办：oa_supervision_task（任务下达 + 进度跟踪 + 办结反馈）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.oa_supervision_task (
  id            uuid PRIMARY KEY,
  title         text NOT NULL,
  source        text NOT NULL DEFAULT 'meeting'
                  CHECK (source IN ('meeting','leadership_order','public_opinion','special_inspection')),
  owner_dept    text NOT NULL,                       -- 责任部门（不允许为空，杜绝踢皮球）
  owner_id      uuid REFERENCES iam.users(id) ON DELETE SET NULL,
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  due_at        timestamptz NOT NULL,
  progress      numeric(5,4) NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 1),
  -- 状态：open进行中 / at_risk有风险 / overdue已超期 / closed已办结
  status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','at_risk','overdue','closed')),
  updates       jsonb NOT NULL DEFAULT '[]'::jsonb,   -- 进度反馈 [{at, note, progress}]
  closed_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.oa_supervision_task IS
  '督查督办：任务必有 owner_dept，按 due_at 跟踪进度，超期自动升级；不允许无人牵头';
COMMENT ON COLUMN clinical.oa_supervision_task.updates IS
  '进度反馈流水：[{at反馈时间, note进展说明, progress进度0~1}]';

-- 超期未办结任务查询：督查办优先盯 overdue / at_risk
CREATE INDEX IF NOT EXISTS idx_oa_supervision_open
  ON clinical.oa_supervision_task (status, due_at)
  WHERE status IN ('open','at_risk','overdue');
