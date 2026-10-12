-- ============================================================================
-- 健澜科技 jlmedaios · M39-B 患者端慢病随访视图权限码
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('patient_chronic:view', '患者端慢病随访查看', 'patient', '患者查看本人血压血糖趋势与下次随访（patient）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('patient','patient_chronic:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
