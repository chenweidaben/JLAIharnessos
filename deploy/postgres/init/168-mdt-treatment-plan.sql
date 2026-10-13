-- 健澜科技 jlmedaios - MDT 结论转治疗方案（M67-A，幂等）

BEGIN;

CREATE TABLE IF NOT EXISTS clinical.mdt_treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mdt_consult_id uuid NOT NULL UNIQUE REFERENCES clinical.mdt_consults(id),
  visit_id uuid NOT NULL,
  plan_type text NOT NULL
    CHECK (plan_type IN ('chemotherapy', 'surgery', 'radiotherapy', 'targeted', 'immunotherapy', 'supportive')),
  draft text NOT NULL,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'cancelled')),
  confirmed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mdt_plan_visit_status
  ON clinical.mdt_treatment_plans (visit_id, status);

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('treatment_plan:manage', '治疗方案管理', 'nursing', 'MDT 结论转治疗方案草稿与确认'),
  ('treatment_plan:view', '治疗方案查看', 'nursing', '查看治疗方案')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('treatment_plan:manage'), ('treatment_plan:view')) AS p(permission_code)
WHERE r.code IN ('admin', 'doctor', 'nurse')
ON CONFLICT DO NOTHING;

COMMIT;
