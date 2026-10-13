-- 健澜科技 jlmedaios - WHO 手术安全核查表（M82-A，幂等）

BEGIN;

CREATE TABLE IF NOT EXISTS clinical.surgical_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_id uuid NOT NULL UNIQUE,
  signin_complete boolean NOT NULL DEFAULT false,
  timeout_complete boolean NOT NULL DEFAULT false,
  signout_complete boolean NOT NULL DEFAULT false,
  patient_confirmed boolean NOT NULL DEFAULT false,
  site_marked boolean NOT NULL DEFAULT false,
  procedure_confirmed boolean NOT NULL DEFAULT false,
  allergy_confirmed boolean NOT NULL DEFAULT false,
  antibiotic_given boolean NOT NULL DEFAULT false,
  blood_prepared boolean NOT NULL DEFAULT false,
  instruments_counted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'passed', 'failed')),
  surgeon uuid,
  anesthetist uuid,
  nurse uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surgical_checklists_surgery_status
  ON clinical.surgical_checklists (surgery_id, status);

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('surgical_check:complete', '手术核查完成', 'nursing', '录入 WHO 手术安全核查表各阶段'),
  ('surgical_check:view', '手术核查查看', 'nursing', '查看手术安全核查表')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('surgical_check:complete'), ('surgical_check:view')) AS p(permission_code)
WHERE r.code IN ('admin', 'doctor', 'nurse')
ON CONFLICT DO NOTHING;

COMMIT;
