-- 健澜科技 jlmedaios - 患者端门户权限（M80-A，幂等，不新业务表）

BEGIN;

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('patient_portal:view', '患者门户查看', 'patient', '查看患者端首页聚合')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('patient_portal:view')) AS p(permission_code)
WHERE r.code IN ('patient')
ON CONFLICT DO NOTHING;

COMMIT;
