-- ============================================================================
-- 健澜科技 jlmedaios - 医院运营管理 · OA 多级审批流（M139-A）
--
-- 【医院运营管理】行政办公（OA）多级审批：请假 / 报销 / 采购 / 用印。
--   强制多级流转，不能一步到位：
--     申请人 → 科室主任 → 分管院长 → 人事/财务
--   其中末级归口按单据类型分流：
--     leave(请假) / seal(用印)      → 人事（hr）
--     expense(报销) / purchase(采购) → 财务（finance）
--
-- 设计要点：
--   - steps 为 jsonb 数组，逐节点留痕（审批人/动作/意见/时间），谁签的、签了什么可溯；
--   - status 为 pending / approved / rejected，任一节点驳回即整单驳回，不跳级；
--   - current_step 指向下一待办节点（0 起），== steps 长度表示流程已走完；
--   - applicant_id 为 iam.users.id，本人不能审批自己的单子（业务层校验）。
--
-- 幂等：重复执行不会报错、不会清空已有审批单。
-- 不触碰 WebSocket：本版仅做拉取式 REST。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

CREATE TABLE IF NOT EXISTS clinical.oa_approvals (
  id              uuid PRIMARY KEY,
  applicant_id    uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
  -- 单据类型：请假 / 报销 / 采购 / 用印
  type            text NOT NULL CHECK (type IN ('leave','expense','purchase','seal')),
  title           text NOT NULL,
  content         text NOT NULL DEFAULT '',
  -- 整单状态：待审批 / 已通过 / 已驳回
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
  -- 多级审批节点留痕：[{order, role, approverId, action, comment, actedAt}]
  steps           jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 下一待办节点下标（0 起）；== steps 长度表示流程已办结
  current_step    integer NOT NULL DEFAULT 0 CHECK (current_step >= 0),
  -- 末级归口：人事 / 财务（按单据类型在创建时定型）
  final_role      text NOT NULL CHECK (final_role IN ('hr','finance')),
  client_ip       text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.oa_approvals IS
  '医院运营管理 OA 多级审批单（请假/报销/采购/用印），强制三级流转不可跳步';
COMMENT ON COLUMN clinical.oa_approvals.steps IS
  '审批节点留痕数组：每节点含 order/role/approverId/action/comment/actedAt';
COMMENT ON COLUMN clinical.oa_approvals.current_step IS
  '下一待办节点下标；等于 steps 长度表示流程已办结';

-- 待办高频查询：按状态 + 更新时间倒序（审批中心列表）
CREATE INDEX IF NOT EXISTS idx_oa_approvals_status_updated
  ON clinical.oa_approvals (status, updated_at DESC);

-- 「我发起的」列表：按申请人 + 时间倒序
CREATE INDEX IF NOT EXISTS idx_oa_approvals_applicant_created
  ON clinical.oa_approvals (applicant_id, created_at DESC);

-- 按类型/归口统计（科室主任、人事、财务看板）
CREATE INDEX IF NOT EXISTS idx_oa_approvals_type_status
  ON clinical.oa_approvals (type, status);
