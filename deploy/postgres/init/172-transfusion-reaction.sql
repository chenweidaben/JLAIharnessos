-- 健澜科技 jlmedaios - 输血反应监控（M71-A，幂等）

BEGIN;

CREATE TABLE IF NOT EXISTS clinical.transfusion_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  transfusion_id uuid,
  reaction_type text NOT NULL CHECK (reaction_type IN ('fever', 'allergy', 'hemolysis', 'taco', 'other')),
  severity text NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
  symptoms text NOT NULL,
  blocked boolean NOT NULL DEFAULT false,
  reported_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfusion_patient_severity
  ON clinical.transfusion_reactions (patient_id, severity);

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('transfusion:report', '输血反应报告', 'nursing', '记录输血不良反应'),
  ('transfusion:view', '输血反应查看', 'nursing', '查看输血不良反应记录')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('transfusion:report'), ('transfusion:view')) AS p(permission_code)
WHERE r.code IN ('admin', 'doctor', 'nurse')
ON CONFLICT DO NOTHING;

COMMIT;
