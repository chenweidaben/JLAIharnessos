-- ============================================================================
-- 健澜科技 jlmedaios · M35-A 急诊预检分诊五级（I-V）+ 绿色通道
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.er_triage_levels (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id       uuid NOT NULL UNIQUE REFERENCES clinical.visits(id),
  level          text NOT NULL CHECK (level IN ('I','II','III','IV','V')),
  chief_complaint text NOT NULL,
  heart_rate     int,
  systolic_bp    int,
  diastolic_bp   int,
  resp_rate      int,
  spo2           int,
  temperature_c  numeric,
  gcs            int,
  green_channel  boolean NOT NULL DEFAULT false,
  triaged_by     uuid NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('er_triage:assess', '急诊分诊录入', 'ed', '分诊护士录入生命体征与主诉并自动定级（nurse/doctor/admin）'),
  ('er_triage:view',  '急诊分诊查看', 'ed', '查看急诊分诊结果（nurse/doctor/admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('admin','er_triage:assess'),('doctor','er_triage:assess'),('nurse','er_triage:assess'),
         ('admin','er_triage:view'),('doctor','er_triage:view'),('nurse','er_triage:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
