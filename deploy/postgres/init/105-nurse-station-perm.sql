-- ============================================================================
-- 健澜科技 jlmedaios · M18-B 补丁：护士站四合一屏权限码幂等迁移
--
-- nurse_station:read 之前以 psql 直插方式存在于当前库，但未沉淀迁移文件；
-- 干净库重部署会缺。本文件补幂等种子（INSERT ... ON CONFLICT DO NOTHING）。
-- 列结构对齐 104-order-cds.sql 同款写法。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('nurse_station:read', '护士站四合一屏只读', 'nurse_station', '在院床旁一览/单患者 workbench 聚合读')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, 'nurse_station:read'
FROM (VALUES ('admin'), ('doctor'), ('nurse')) AS t(r)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.role_code = t.r AND rp.permission_code = 'nurse_station:read'
);
