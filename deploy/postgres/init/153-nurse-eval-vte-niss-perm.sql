-- ============================================================================
-- 健澜科技 jlmedaios · M46-C 护士屏 VTE/院感块权限码确保
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('nurse_eval:view', '护士站评估汇总屏', 'nursing', '单患者护理评估聚合（admin/doctor/nurse）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('admin','nurse_eval:view'),('doctor','nurse_eval:view'),('nurse','nurse_eval:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
