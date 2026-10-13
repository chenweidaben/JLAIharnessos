-- 健澜科技 jlmedaios - M83-A 护士站床旁屏手术核查块权限补齐（幂等）
-- 不新增业务表；仅确保 nurse_eval:view 权限与 admin/doctor/nurse 授权在位。

BEGIN;

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('nurse_eval:view', '护士站评估汇总查看', 'nursing', '查看床旁屏单患者护理评估汇总')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE p.code = 'nurse_eval:view'
   AND r.code IN ('admin', 'doctor', 'nurse')
ON CONFLICT (role_code, permission_code) DO NOTHING;

COMMIT;
