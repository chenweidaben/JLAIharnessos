-- ============================================================================
-- 健澜科技 jlmedaios · M23-E 医保驾驶舱科室/医生维度下钻权限
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('settlement_drilldown:view', '结算科室/医生维度下钻排名', 'operations', '科主任/医保办查看科室与主治医师的结算总额、超支率、药占比排名')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, 'settlement_drilldown:view' FROM (VALUES ('admin'), ('doctor')) AS r(role_code)
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions rp WHERE rp.permission_code='settlement_drilldown:view' AND rp.role_code=r.role_code);
