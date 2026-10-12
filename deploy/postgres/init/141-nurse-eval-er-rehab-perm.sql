-- ============================================================================
-- 健澜科技 jlmedaios · M38-A 护士屏扩展急诊/Barthel 块（幂等权限码）
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('nurse_eval:view', '护士站患者评估汇总查看', 'nurse', '单患者一屏看全护理评估/手术麻醉/ICU/产后/急诊/康复（admin/doctor/nurse）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('admin','nurse_eval:view'),('doctor','nurse_eval:view'),('nurse','nurse_eval:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
