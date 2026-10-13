-- 健澜科技 jlmedaios - 急诊留观登记（M74-A，幂等）

BEGIN;

CREATE TABLE IF NOT EXISTS clinical.ed_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  triage_level text NOT NULL CHECK (triage_level IN ('I', 'II', 'III', 'IV', 'V')),
  entered_at timestamptz NOT NULL DEFAULT now(),
  discharged_at timestamptz,
  disposition text CHECK (disposition IN ('admitted', 'discharged', 'transferred', 'left_ama')),
  status text NOT NULL DEFAULT 'observing' CHECK (status IN ('observing', 'closed')),
  registered_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edobs_status_entered
  ON clinical.ed_observations (status, entered_at);

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('ed_obs:register', '急诊留观登记', 'nursing', '登记急诊留观患者'),
  ('ed_obs:view', '急诊留观看', 'nursing', '查看急诊留观记录')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('ed_obs:register'), ('ed_obs:view')) AS p(permission_code)
WHERE r.code IN ('admin', 'doctor', 'nurse')
ON CONFLICT DO NOTHING;

COMMIT;
