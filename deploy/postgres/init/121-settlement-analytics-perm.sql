-- ============================================================================
-- 健澜科技 jlmedaios · M23-D 结算报表同比环比分析 + 医保驾驶舱权限
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('settlement_analytics:view', '结算同比环比分析与医保驾驶舱', 'operations', '医保办查看月度结算趋势、病例结构与费用占比分析')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, 'settlement_analytics:view' FROM (VALUES ('admin'), ('doctor')) AS r(role_code)
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions rp WHERE rp.permission_code='settlement_analytics:view' AND rp.role_code=r.role_code);
