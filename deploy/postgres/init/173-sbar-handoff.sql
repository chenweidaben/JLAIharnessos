-- 健澜科技 jlmedaios - 院内转运交接 SBAR（M73-A，幂等）

BEGIN;

CREATE TABLE IF NOT EXISTS clinical.sbar_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL,
  from_unit text NOT NULL,
  to_unit text NOT NULL,
  s_situation text NOT NULL,
  b_background text NOT NULL,
  a_assessment text NOT NULL,
  r_recommendation text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'closed')),
  receiver_uuid uuid,
  received_at timestamptz,
  handoff_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sbar_visit_status
  ON clinical.sbar_handoffs (visit_id, status);

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('sbar:create', 'SBAR 建交接', 'nursing', '发起院内转运 SBAR 交接'),
  ('sbar:view', 'SBAR 查看', 'nursing', '查看 SBAR 交接记录')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('sbar:create'), ('sbar:view')) AS p(permission_code)
WHERE r.code IN ('admin', 'doctor', 'nurse')
ON CONFLICT DO NOTHING;

COMMIT;
