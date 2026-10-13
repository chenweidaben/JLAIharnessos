-- 健澜科技 jlmedaios - 合理用药统计看板（M77-A，幂等）

BEGIN;

CREATE TABLE IF NOT EXISTS clinical.am_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  department text NOT NULL,
  ddds_total numeric NOT NULL DEFAULT 0,
  inpatient_days int NOT NULL DEFAULT 0,
  antibiotic_patients int NOT NULL DEFAULT 0,
  total_inpatients int NOT NULL DEFAULT 0,
  special_class_patients int NOT NULL DEFAULT 0,
  prophylaxis_cases int NOT NULL DEFAULT 0,
  prophylaxis_reasonable int NOT NULL DEFAULT 0,
  submitted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_am_metrics_month_dept UNIQUE (month, department)
);

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('am_dash:submit', '药事指标提交', 'nursing', '按月提交合理用药监测指标'),
  ('am_dash:view', '药事看板查看', 'nursing', '查看合理用药统计看板')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('am_dash:submit'), ('am_dash:view')) AS p(permission_code)
WHERE r.code IN ('admin', 'doctor', 'nurse', 'pharmacist')
ON CONFLICT DO NOTHING;

COMMIT;
