-- ============================================================================
-- 健澜科技 jlmedaios · M62-A 复诊号源预约联动（复用 M19 号源库存）
-- 幂等建表 + 权限码。
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.followup_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discharge_plan_id uuid NOT NULL UNIQUE REFERENCES clinical.discharge_plans(id),
  schedule_id uuid NOT NULL,
  appointment_date date NOT NULL,
  department text NOT NULL,
  status text NOT NULL DEFAULT 'booked'
    CHECK (status IN ('booked','cancelled','completed')),
  booked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followup_appt_date_status
  ON clinical.followup_appointments (appointment_date, status);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('followup_appt:book', '复诊预约', 'appointment', '基于出院计划推荐并占用复诊号源'),
  ('followup_appt:view', '复诊预约查看', 'appointment', '查看复诊预约与号源推荐')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES
    ('admin','followup_appt:book'),('doctor','followup_appt:book'),('nurse','followup_appt:book'),
    ('admin','followup_appt:view'),('doctor','followup_appt:view'),('nurse','followup_appt:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code = t.r AND rp.permission_code = t.p
);
