-- ============================================================================
-- 健澜科技 jlmedaios · M3-K 互联网医院 · 预约 + 图文问诊
-- 64-consultation.sql
--
-- 复诊图文问诊：患者发起（复诊资格校验）→ 医生接诊 → 图文消息 → 结束/取消。
-- 会话状态机：pending（待接诊）→ in_consultation（问诊中）→ completed（已完成）；
--             pending/in_consultation → cancelled（已取消）；pending → timed_out（超时）。
--
-- 两表：
--  （1）clinical.consultation_sessions  图文问诊会话
--  （2）clinical.consultation_messages  会话消息（文本/图片/系统，级联删除）
--
-- 合规要点：
--  · 仅复诊（followup），发起前校验本院历史就诊记录，禁止首诊；
--  · 发起须实名认证（auth_level≥2，由聚合器校验）；
--  · 同一就诊人对同一医生存在未结束会话时禁止重复发起；
--  · 医生须具备线上资质（approved，由聚合器校验）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- 注释全角括号，避免朴素括号配平检查误报。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- （1）图文问诊会话
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.consultation_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_no          text NOT NULL UNIQUE,
  account_id          uuid NOT NULL REFERENCES clinical.patient_accounts(id),
  profile_id          uuid NOT NULL REFERENCES clinical.patient_profiles(id),
  patient_id          uuid NOT NULL REFERENCES clinical.patients(id),
  doctor_id           uuid REFERENCES iam.users(id),
  department          text NOT NULL,
  visit_type          text NOT NULL DEFAULT 'followup'
                        CHECK (visit_type IN ('followup')),
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','in_consultation','completed',
                                         'cancelled','timed_out')),
  eligibility_passed  boolean NOT NULL DEFAULT false,
  last_visit_id       uuid REFERENCES clinical.visits(id),
  last_visit_at       timestamptz,
  chief_complaint     text,
  cancel_reason       text,
  accepted_at         timestamptz,
  completed_at        timestamptz,
  cancelled_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consult_account ON clinical.consultation_sessions(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consult_doctor_status ON clinical.consultation_sessions(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_consult_pending ON clinical.consultation_sessions(status, created_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_consult_patient ON clinical.consultation_sessions(patient_id);
-- 同一就诊人对同一医生仅允许一个未结束（pending/in_consultation）会话，
-- 部分唯一索引在数据库层兜底防重复发起。
CREATE UNIQUE INDEX IF NOT EXISTS idx_consult_open
  ON clinical.consultation_sessions(profile_id, doctor_id)
  WHERE status IN ('pending','in_consultation');

DROP TRIGGER IF EXISTS trg_consult_updated ON clinical.consultation_sessions;
CREATE TRIGGER trg_consult_updated BEFORE UPDATE ON clinical.consultation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- （2）会话消息
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.consultation_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES clinical.consultation_sessions(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('patient','doctor','system')),
  sender_id   uuid,
  msg_type    text NOT NULL DEFAULT 'text'
                CHECK (msg_type IN ('text','image','system')),
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultmsg_session ON clinical.consultation_messages(session_id, created_at);

-- ----------------------------------------------------------------------------
-- 权限点与角色授权
-- 患者端使用患者 JWT（roles=['patient']），不占用院内权限码；
-- 医生端使用互联网问诊权限码。
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('internet:consultation',       '互联网图文问诊', 'internet-hospital',
     '医生线上接诊、图文回复、结束问诊会话'),
  ('internet:consultation:audit', '互联网问诊监管', 'internet-hospital',
     '监管/查看全院互联网问诊会话与记录')
ON CONFLICT (code) DO NOTHING;

-- 医生：接诊与回复
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
 CROSS JOIN iam.permissions p
 WHERE r.code = 'doctor'
   AND p.code IN ('internet:consultation','internet:consultation:audit')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 管理端：监管
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
 CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code IN ('internet:consultation:audit')
ON CONFLICT (role_code, permission_code) DO NOTHING;
