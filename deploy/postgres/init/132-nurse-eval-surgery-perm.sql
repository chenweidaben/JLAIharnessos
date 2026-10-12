-- ============================================================================
-- 健澜科技 jlmedaios · M32-A 护士屏手术麻醉块权限码补齐
-- 确保 nurse_eval:view 与 admin/doctor/nurse 授权在位（幂等）。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('nurse_eval:view', '护理评估汇总查看', 'nurse_station', '查看单患者护理评估与待办工单汇总（admin/doctor/nurse）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (VALUES ('admin','nurse_eval:view'),('doctor','nurse_eval:view'),('nurse','nurse_eval:view')) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
