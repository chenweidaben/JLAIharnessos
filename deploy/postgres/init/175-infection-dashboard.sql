-- 健澜科技 jlmedaios - 院内感染监测看板（M76-A，幂等）

BEGIN;

CREATE TABLE IF NOT EXISTS clinical.infection_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  department text NOT NULL,
  hand_hygiene_observations int NOT NULL DEFAULT 0,
  hand_hygiene_compliant int NOT NULL DEFAULT 0,
  cauti_cases int NOT NULL DEFAULT 0,
  catheter_days int NOT NULL DEFAULT 0,
  vap_cases int NOT NULL DEFAULT 0,
  ventilator_days int NOT NULL DEFAULT 0,
  clabsi_cases int NOT NULL DEFAULT 0,
  central_line_days int NOT NULL DEFAULT 0,
  ssi_cases int NOT NULL DEFAULT 0,
  operation_count int NOT NULL DEFAULT 0,
  submitted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_infection_metrics_month_dept UNIQUE (month, department)
);

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('infection_dash:submit', '院感指标提交', 'nursing', '按月提交院感监测指标'),
  ('infection_dash:view', '院感看板查看', 'nursing', '查看院感监测看板')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('infection_dash:submit'), ('infection_dash:view')) AS p(permission_code)
WHERE r.code IN ('admin', 'doctor', 'nurse')
ON CONFLICT DO NOTHING;

COMMIT;
