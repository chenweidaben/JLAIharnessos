-- ============================================================================
-- 健澜科技 jlmedaios · M172-D 患者服务与体验深化（老人也能用）
-- 345-patient-deep.sql
--
-- 【安全质量与运营】患者服务要简单好用，老人也能用。在 281-patient-service.sql
-- 的 clinical.patient_service_ticket（五类诉求限时工单）之上，把「患者服务中心」
-- 从被动受理升级为「主动全链路陪伴」，补齐四大深化域：
--
--   ① 智能导诊深化：症状 → 科室 → 医生 → 号源 全链路推荐（patient_guide_session）；
--   ② 院内导航深化：实时定位 + 室内地图 + AR 导引（patient_nav_route）；
--   ③ 智慧门诊：分时预约 + 智能分诊 + 移动支付 + 报告推送（patient_outpatient_flow）；
--   ④ 智慧住院：入院准备 + 移动护士站 + 出院结算 + 随访闭环（patient_inpatient_flow）。
--
-- 适老化红线（安全质量与运营）：
--   - 全链路默认「大字号 / 高对比 / 语音播报 / 一步直达」，不强制患者操作多步；
--   - 导诊推荐为辅助分诊，不能替代急诊/危重识别：红旗症状（胸痛/昏迷/大出血…）
--     一律强制跳转急诊，系统不允许把危重患者导到普通门诊排队；
--   - 患者标识在 BFF 层脱敏后入库（P0****23），本切片不沉淀明文 PII；
--   - 随访闭环要求「出院后 7/30/90 天」随访动作留痕，失访自动提醒，不石沉大海。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS /
--       ON CONFLICT DO NOTHING / WHERE NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ---------------------------------------------------------------------------
-- 0. 扩展既有 patient_service_ticket：挂载深化域字段（幂等加列）
-- ---------------------------------------------------------------------------
-- 本次深化给「诉求工单」补两类可空字段：是否适老化通道发起、关联的深化会话编号
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'patient_service_ticket'
      AND column_name = 'elderly_channel'
  ) THEN
    ALTER TABLE clinical.patient_service_ticket
      ADD COLUMN elderly_channel boolean NOT NULL DEFAULT false; -- 是否走适老化（大字/语音/志愿者代填）通道
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'patient_service_ticket'
      AND column_name = 'deep_session_ref'
  ) THEN
    -- 关联深化会话：导诊/导航/门诊/住院任一深化域产生的会话编号（可空）
    ALTER TABLE clinical.patient_service_ticket
      ADD COLUMN deep_session_ref text NOT NULL DEFAULT '';
  END IF;
END $$;

COMMENT ON COLUMN clinical.patient_service_ticket.elderly_channel IS
  '【安全质量与运营】是否走适老化通道（大字号/语音播报/志愿者代填），老人也能用';
COMMENT ON COLUMN clinical.patient_service_ticket.deep_session_ref IS
  '关联深化域会话编号：导诊/导航/门诊/住院（可空）';

-- ---------------------------------------------------------------------------
-- ① 智能导诊深化：症状 → 科室 → 医生 → 号源 全链路推荐
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.patient_guide_session (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_no          text NOT NULL UNIQUE,                 -- 导诊会话编号（G + 时间戳 + 后缀）
  patient_id        text NOT NULL DEFAULT '',             -- 【安全质量与运营】脱敏患者标识
  -- 患者用大白话描述的症状（不要求医学术语，老人也能说）
  symptom_text      text NOT NULL DEFAULT '',
  -- 症状标签（NLP 归一化后的标准症状码，多选）
  symptom_codes     jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 红旗症状判定：true 时必须强制急诊，不得导普通门诊
  red_flag          boolean NOT NULL DEFAULT false,
  red_flag_reason   text NOT NULL DEFAULT '',             -- 触发红旗的症状原因（如「胸痛>15分钟」）
  -- 全链路推荐结果
  recommended_dept_code   text NOT NULL DEFAULT '',        -- 推荐科室代码
  recommended_dept_name   text NOT NULL DEFAULT '',        -- 推荐科室中文名
  recommended_doctor_id   text NOT NULL DEFAULT '',        -- 推荐医生标识（可空）
  recommended_doctor_name text NOT NULL DEFAULT '',        -- 推荐医生姓名
  recommended_slot      text NOT NULL DEFAULT '',           -- 推荐号源时段（如 今天上午 09:30-10:00）
  slot_remain           integer NOT NULL DEFAULT 0,        -- 该时段剩余号源
  confidence          numeric(4,3) NOT NULL DEFAULT 0,     -- 推荐置信度 0..1
  fallback_depts      jsonb NOT NULL DEFAULT '[]'::jsonb, -- 备选科室列表（拿不准时给 2-3 个）
  -- 适老化：是否朗读了推荐结果、是否志愿者协助
  voice_spoke         boolean NOT NULL DEFAULT false,
  volunteer_assisted  boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE clinical.patient_guide_session IS
  '【安全质量与运营】智能导诊深化：症状→科室→医生→号源全链路推荐，红旗症状强制急诊';
CREATE INDEX IF NOT EXISTS idx_pgs_patient_created
  ON clinical.patient_guide_session (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pgs_redflag
  ON clinical.patient_guide_session (red_flag, created_at DESC)
  WHERE red_flag = true;
DROP TRIGGER IF EXISTS trg_pgs_updated ON clinical.patient_guide_session;
CREATE TRIGGER trg_pgs_updated BEFORE UPDATE ON clinical.patient_guide_session
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ② 院内导航深化：实时定位 + 室内地图 + AR 导引
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.patient_nav_route (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nav_no          text NOT NULL UNIQUE,                   -- 导航会话编号（N + 时间戳 + 后缀）
  patient_id      text NOT NULL DEFAULT '',               -- 脱敏患者标识
  start_name      text NOT NULL DEFAULT '',               -- 起点（如 门诊大厅 / 3号电梯）
  dest_name       text NOT NULL DEFAULT '',               -- 终点（推荐科室/检查室）
  start_floor     integer NOT NULL DEFAULT 1,             -- 起点楼层
  dest_floor      integer NOT NULL DEFAULT 1,             -- 终点楼层
  -- 室内路径关键点（JSON：[{node:'门诊大厅',floor:1,lat:..,lng:..,type:'start'}...]）
  path_points     jsonb NOT NULL DEFAULT '[]'::jsonb,
  distance_m      numeric(8,1) NOT NULL DEFAULT 0,        -- 规划步行距离（米）
  eta_min         numeric(6,1) NOT NULL DEFAULT 0,        -- 预计步行耗时（分钟）
  -- 适老化：是否启用无障碍通道（坡道/直梯）、是否开启 AR 导引
  barrier_free     boolean NOT NULL DEFAULT false,
  ar_guidance     boolean NOT NULL DEFAULT false,
  -- 是否中途迷路/重新规划（运营侧用于评估导航质量）
  replanned       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE clinical.patient_nav_route IS
  '【安全质量与运营】院内导航深化：实时定位+室内地图+AR导引，默认无障碍，老人不迷路';
CREATE INDEX IF NOT EXISTS idx_pnr_patient_created
  ON clinical.patient_nav_route (patient_id, created_at DESC);
DROP TRIGGER IF EXISTS trg_pnr_updated ON clinical.patient_nav_route;
CREATE TRIGGER trg_pnr_updated BEFORE UPDATE ON clinical.patient_nav_route
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ③ 智慧门诊：分时预约 + 智能分诊 + 移动支付 + 报告推送
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.patient_outpatient_flow (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  op_visit_no        text NOT NULL UNIQUE,                 -- 门诊就诊流水号
  patient_id        text NOT NULL DEFAULT '',             -- 脱敏患者标识
  guide_session_id  uuid REFERENCES clinical.patient_guide_session(id), -- 关联导诊会话
  -- 分时预约
  appt_slot         text NOT NULL DEFAULT '',             -- 预约时段
  checkin_at        timestamptz,                          -- 签到时间（到院取号）
  triage_level      integer NOT NULL DEFAULT 0,           -- 智能分诊级别（0 未分诊 / 1-5）
  queue_no          text NOT NULL DEFAULT '',             -- 候诊号
  predicted_wait_min numeric(6,1) NOT NULL DEFAULT 0,     -- 等待时间预测（分钟）
  -- 移动支付
  paid_amount       numeric(10,2) NOT NULL DEFAULT 0,    -- 已支付金额
  pay_status        text NOT NULL DEFAULT 'unpaid'
                    CHECK (pay_status IN ('unpaid','paid','refunded')),
  -- 报告推送
  report_status     text NOT NULL DEFAULT 'pending'
                    CHECK (report_status IN ('pending','ready','pushed','viewed')),
  pushed_at        timestamptz,                          -- 报告推送时间
  viewed_at        timestamptz,                          -- 患者查看时间
  -- 适老化
  elderly_channel  boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE clinical.patient_outpatient_flow IS
  '【安全质量与运营】智慧门诊：分时预约+智能分诊+移动支付+报告推送，少排队少跑路';
CREATE INDEX IF NOT EXISTS idx_pof_patient_created
  ON clinical.patient_outpatient_flow (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pof_report_push
  ON clinical.patient_outpatient_flow (report_status, pushed_at)
  WHERE report_status = 'ready';
DROP TRIGGER IF EXISTS trg_pof_updated ON clinical.patient_outpatient_flow;
CREATE TRIGGER trg_pof_updated BEFORE UPDATE ON clinical.patient_outpatient_flow
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ④ 智慧住院：入院准备 + 移动护士站 + 出院结算 + 随访闭环
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.patient_inpatient_flow (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_visit_no        text NOT NULL UNIQUE,                 -- 住院就诊号
  patient_id        text NOT NULL DEFAULT '',             -- 脱敏患者标识
  -- 入院准备
  admission_ready   boolean NOT NULL DEFAULT false,        -- 入院材料/床位/缴费是否一站式备齐
  prep_note         text NOT NULL DEFAULT '',
  ward_name         text NOT NULL DEFAULT '',             -- 病区
  bed_no            text NOT NULL DEFAULT '',             -- 床号
  -- 移动护士站
  nurse_call_count  integer NOT NULL DEFAULT 0,            -- 移动呼叫次数
  last_call_at      timestamptz,
  -- 出院结算
  discharge_bill    numeric(12,2) NOT NULL DEFAULT 0,     -- 出院总费用
  settled           boolean NOT NULL DEFAULT false,        -- 是否移动结算完成
  discharged_at     timestamptz,
  -- 随访闭环：7/30/90 天随访动作留痕
  fu_7d_status      text NOT NULL DEFAULT 'pending'
                    CHECK (fu_7d_status IN ('pending','done','missed')),
  fu_30d_status     text NOT NULL DEFAULT 'pending'
                    CHECK (fu_30d_status IN ('pending','done','missed')),
  fu_90d_status     text NOT NULL DEFAULT 'pending'
                    CHECK (fu_90d_status IN ('pending','done','missed')),
  elderly_channel   boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE clinical.patient_inpatient_flow IS
  '【安全质量与运营】智慧住院：入院准备+移动护士站+出院结算+随访闭环，出院不失联';
CREATE INDEX IF NOT EXISTS idx_pif_patient_created
  ON clinical.patient_inpatient_flow (patient_id, created_at DESC);
-- 失访扫描：已出院但存在 pending 随访
CREATE INDEX IF NOT EXISTS idx_pif_followup_pending
  ON clinical.patient_inpatient_flow (fu_7d_status, fu_30d_status, fu_90d_status)
  WHERE discharged_at IS NOT NULL;
DROP TRIGGER IF EXISTS trg_pif_updated ON clinical.patient_inpatient_flow;
CREATE TRIGGER trg_pif_updated BEFORE UPDATE ON clinical.patient_inpatient_flow
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限码（幂等）：患者服务深化只读 / 推荐与导航 / 随访闭环
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('patient_deep:read',   '患者服务深化只读', 'patient_deep', '查看导诊推荐/导航路径/门诊住院流程与随访状态（患者/医护只读）'),
  ('patient_deep:guide',  '智能导诊与导航',   'patient_deep', '症状导诊推荐、院内导航与号源推荐（含红旗急诊强制）（医生/导诊/志愿者）'),
  ('patient_deep:followup','出院随访闭环',     'patient_deep', '入院准备/移动结算/7·30·90天随访登记与失访提醒（护士/医生）')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：read 全员；guide 授 doctor/导诊/admin；followup 授 nurse/doctor/admin
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM (VALUES ('admin'),('doctor'),('nurse'),('patient')) AS r(code)
  CROSS JOIN (VALUES ('patient_deep:read')) AS p(code)
 WHERE NOT EXISTS (
   SELECT 1 FROM iam.role_permissions rp
    WHERE rp.role_code = r.code AND rp.permission_code = p.code
 );

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM (VALUES ('admin'),('doctor')) AS r(code)
  CROSS JOIN (VALUES ('patient_deep:guide')) AS p(code)
 WHERE NOT EXISTS (
   SELECT 1 FROM iam.role_permissions rp
    WHERE rp.role_code = r.code AND rp.permission_code = p.code
 );

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM (VALUES ('admin'),('doctor'),('nurse')) AS r(code)
  CROSS JOIN (VALUES ('patient_deep:followup')) AS p(code)
 WHERE NOT EXISTS (
   SELECT 1 FROM iam.role_permissions rp
    WHERE rp.role_code = r.code AND rp.permission_code = p.code
 );
