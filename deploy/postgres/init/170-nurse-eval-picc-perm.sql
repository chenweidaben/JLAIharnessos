-- 健澜科技 jlmedaios - 护士屏 PICC 块权限幂等（M69-A）
-- 不新业务表；幂等确保 nurse_eval:view 权限与授权在位。

BEGIN;

INSERT INTO iam.permissions (code, name, module, description)
VALUES ('nurse_eval:view', '护士屏评估查看', 'nursing', '查看患者护理评估汇总屏')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('nurse_eval:view')) AS p(permission_code)
WHERE r.code IN ('admin', 'doctor', 'nurse')
ON CONFLICT DO NOTHING;

COMMIT;
