-- ============================================================================
-- 健澜科技 jlmedaios · M30-A 护理评估汇总屏权限码
-- 不新建业务表（纯读聚合，复用 M18-B 护士站）。
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
