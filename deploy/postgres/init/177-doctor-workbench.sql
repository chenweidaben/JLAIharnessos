-- 健澜科技 jlmedaios - 医生站工作台权限（M79-A，幂等，不新业务表）

BEGIN;

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('workbench:view', '医生工作台查看', 'nursing', '查看医生站首页工作台聚合')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('workbench:view')) AS p(permission_code)
WHERE r.code IN ('admin', 'doctor', 'nurse')
ON CONFLICT DO NOTHING;

COMMIT;
