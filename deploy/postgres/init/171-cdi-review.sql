-- 健澜科技 jlmedaios - 合理用药审查 CDI（M70-A，幂等）

BEGIN;

CREATE TABLE IF NOT EXISTS clinical.cdi_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  visit_id uuid,
  drug_name text NOT NULL,
  review_type text NOT NULL CHECK (review_type IN ('interaction', 'contraindication', 'allergy', 'dose')),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'block')),
  message text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  reviewed_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cdi_patient_resolved
  ON clinical.cdi_reviews (patient_id, resolved);

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('cdi:review', 'CDI 审查', 'nursing', '合理用药相互作用/过敏/剂量审查'),
  ('cdi:view', 'CDI 查看', 'nursing', '查看用药审查记录')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('cdi:review'), ('cdi:view')) AS p(permission_code)
WHERE r.code IN ('admin', 'doctor', 'nurse')
ON CONFLICT DO NOTHING;

COMMIT;
