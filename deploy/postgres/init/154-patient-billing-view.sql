-- ============================================================================
-- 健澜科技 jlmedaios · M50-A 患者端住院费用/医保预估/押金余额视图权限
-- 不新建业务表：复用 clinical.fee_items（费用明细）、clinical.online_payments
-- （已付/押金）、clinical.patient_profiles（账号→就诊人自限域绑定）。
-- ============================================================================

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('patient_billing:view', '患者端住院费用视图', 'patient', '患者查看本人在院费用明细/医保结算预估/押金余额')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('patient','patient_billing:view'),('admin','patient_billing:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
