-- ============================================================================
-- 健澜科技 jlmedaios · M57-A 护士屏 CGA 块权限幂等确保
-- 不新业务表：复用 M56 cga_assessments。
-- 幂等确保 nurse_eval:view 权限与院方角色授权在位。
-- ============================================================================

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('nurse_eval:view', '护士站评估汇总查看', 'nursing', '查看单患者护理评估汇总（含老年综合评估块）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES
    ('admin','nurse_eval:view'),('doctor','nurse_eval:view'),('nurse','nurse_eval:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code = t.r AND rp.permission_code = t.p
);
