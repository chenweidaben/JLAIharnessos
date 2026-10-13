-- 健澜科技 jlmedaios - MDT 多学科会诊（M66-A，幂等）

BEGIN;

CREATE TABLE IF NOT EXISTS clinical.mdt_consults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL,
  title text NOT NULL,
  reason text NOT NULL,
  departments text[] NOT NULL DEFAULT '{}',
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'scheduled', 'held', 'concluded', 'cancelled')),
  minutes text,
  conclusion text,
  requested_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mdt_status_visit
  ON clinical.mdt_consults (status, visit_id);

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('mdt:request', 'MDT 发起', 'nursing', '发起多学科会诊申请'),
  ('mdt:view', 'MDT 查看', 'nursing', '查看多学科会诊记录')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('mdt:request'), ('mdt:view')) AS p(permission_code)
WHERE r.code IN ('admin', 'doctor', 'nurse')
ON CONFLICT DO NOTHING;

COMMIT;
