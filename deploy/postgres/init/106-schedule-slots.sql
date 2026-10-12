-- ============================================================================
-- 健澜科技 jlmedaios · M19-A 号源排班与分时段预约
--
-- doctor_schedules：医生某日排班；appointment_slots：分时段号源池（row lock 防超卖）。
-- 权限码：schedule:manage（admin/doctor 建排班）、schedule:book（patient/nurse/doctor/admin 约号/退号）。
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.doctor_schedules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    uuid NOT NULL,
  department   text,
  work_date    date NOT NULL,
  note         text,
  created_by   uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, work_date)
);

CREATE TABLE IF NOT EXISTS clinical.appointment_slots (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id    uuid NOT NULL REFERENCES clinical.doctor_schedules(id) ON DELETE CASCADE,
  slot_start     timestamptz NOT NULL,
  slot_end       timestamptz NOT NULL,
  total_quota    int NOT NULL CHECK (total_quota > 0 AND total_quota <= 200),
  booked_count   int NOT NULL DEFAULT 0 CHECK (booked_count >= 0),
  status         text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_quota CHECK (booked_count <= total_quota)
);
CREATE INDEX IF NOT EXISTS idx_slots_sched_time ON clinical.appointment_slots(schedule_id, slot_start);

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('schedule:manage', '医生排班管理', 'schedule_slot', '医生/管理员建排班+批量时段'),
  ('schedule:book', '分时段约号退号', 'schedule_slot', '患者/护士/医生约号与退号')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (VALUES
  ('admin','schedule:manage'),('admin','schedule:book'),
  ('doctor','schedule:manage'),('doctor','schedule:book'),
  ('nurse','schedule:book'),
  ('patient','schedule:book')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
