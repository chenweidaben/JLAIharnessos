-- ============================================================================
-- 健澜科技 jlmedaios · M60-A 护士屏营养会诊/睡眠筛查块权限（幂等）
-- 不新业务表；幂等确保 nurse_eval:view 权限与授权在位。
-- ============================================================================

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('nurse_eval:view', '护士评估汇总', 'nurse', '查看单患者护理评估汇总屏')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES
    ('admin','nurse_eval:view'),('doctor','nurse_eval:view'),('nurse','nurse_eval:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code = t.r AND rp.permission_code = t.p
);
