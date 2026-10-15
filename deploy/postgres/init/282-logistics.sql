-- ============================================================================
-- 健澜科技 jlmedaios - 医院后勤报修工单（M142-D）【预防保健与患者服务】
--
-- 【业务目标】后勤报修要跟踪到完成，不能报了没人管。
--   传统后勤报修是「电话报修 + 本子登记」，报完之后派没派、修没修、多久修好
--   全靠人盯。本模块把每一条报修收敛成一张工单，状态机强制走完全程：
--     待派工 -> 已派工 -> 处理中 -> 已完成
--   派工时登记处理人与预计完成时间（eta），超过 eta 仍未完成的工单
--   自动进入超时预警清单，后勤主管一眼看到哪些单子在「挂着没人管」。
--
-- 后勤类型（与 logisticsAggregator.ts 的 LogisticsType 枚举一致）：
--   equipment_repair 设备维修
--   water_electric   水电维修
--   cleaning         清洁服务
--   linen_change     被服更换
--   moving           搬运服务
--
-- 工单状态（与 aggregator 的 RequestStatus 一致）：
--   pending_assignment 待派工
--   assigned           已派工
--   processing         处理中
--   done               已完成
--
-- 幂等：重复执行不会报错、不会清空已有数据。
-- 不触碰 WebSocket：本版仅做拉取式 REST，实时推送留待后续。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ----------------------------------------------------------------------------
-- 后勤报修工单主表（logistics_request）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.logistics_request (
  id               uuid PRIMARY KEY,
  -- 报修人（员工 id）
  requester_id     text NOT NULL,
  -- 报修科室，如 急诊科 / 住院部 3 病区
  dept             text NOT NULL DEFAULT '',
  type             text NOT NULL
                   CHECK (type IN
                     ('equipment_repair','water_electric','cleaning','linen_change','moving')),
  description      text NOT NULL DEFAULT '',
  status           text NOT NULL DEFAULT 'pending_assignment'
                   CHECK (status IN
                     ('pending_assignment','assigned','processing','done')),
  -- 派工后回填：处理人工号 / 预计完成时间；NULL = 尚未派工
  handler_id       text NULL,
  eta              timestamptz NULL,
  assigned_at      timestamptz NULL,
  processing_at    timestamptz NULL,
  done_at          timestamptz NULL,
  -- 超时预警标记：BFF 扫描发现 now > eta 且未完成时置 true，供看板红点提醒
  overdue_flag     boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.logistics_request IS
  '后勤报修工单（预防保健与患者服务）：报修->派工->处理->完成全程留痕，超时未完成自动预警';
COMMENT ON COLUMN clinical.logistics_request.eta IS
  '派工时登记的预计完成时间；now 超过该值且工单未完成即触发超时预警，杜绝报了没人管';
COMMENT ON COLUMN clinical.logistics_request.overdue_flag IS
  '超时预警标记：true 表示已超过预计完成时间仍未闭环';

-- 按报修人查「我的报修」：GET /api/v1/logistics/my-requests 高频
CREATE INDEX IF NOT EXISTS idx_logistics_request_requester
  ON clinical.logistics_request (requester_id, created_at DESC);

-- 后勤主管看板：按状态过滤待办；未完成工单按 eta 升序，最急的排最前
CREATE INDEX IF NOT EXISTS idx_logistics_request_status_eta
  ON clinical.logistics_request (status, eta)
  WHERE status <> 'done';

-- 超时预警快查：只取已打标、未完成的工单
CREATE INDEX IF NOT EXISTS idx_logistics_request_overdue
  ON clinical.logistics_request (eta)
  WHERE overdue_flag = true AND status <> 'done';

-- ----------------------------------------------------------------------------
-- 派工流水（每次派工一条，留痕可追溯；主表冗余 handler_id / eta 便于快查）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.logistics_task (
  id           uuid PRIMARY KEY,
  request_id   uuid NOT NULL REFERENCES clinical.logistics_request(id) ON DELETE CASCADE,
  handler_id   text NOT NULL,
  eta          timestamptz NOT NULL,
  note         text NOT NULL DEFAULT '',
  assigned_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.logistics_task IS
  '后勤派工流水：每次派工留痕，handler_id / eta 同步回写工单主表';

-- 某张工单的派工历史：按时间倒序
CREATE INDEX IF NOT EXISTS idx_logistics_task_request
  ON clinical.logistics_task (request_id, assigned_at DESC);
