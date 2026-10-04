-- =====================================================================
-- M8-B 角色与权限管理（Role & Permission Administration）
-- =====================================================================
-- 系统管理中的角色管理、权限管理原先在前端使用本地 mock。本迁移新增
-- 角色管理权限，使管理员能够：
--   · 查看角色与其权限、关联用户；
--   · 新增自定义角色，编辑角色名称与描述；
--   · 为角色分配权限（权限点由迁移统一定义，不在运行时凭空新增）；
--   · 删除自定义角色（系统内置角色受保护）。
--
-- 设计要点：
--   · 权限点必须与代码中的 requirePermissionCode 对应，因此权限以
--     迁移/代码为准，管理端对权限目录只读；
--   · 系统内置角色（is_system=true）不可删除，仅可调整权限；
--   · 自定义角色（is_system=false）可删除，删除前须无用户关联。
--
-- 版权所有（c）2026 杭州健澜科技有限公司
-- =====================================================================

-- 角色管理权限码
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('role:manage', '角色管理', 'system',
     '新增/编辑角色、为角色分配权限、删除自定义角色、查看角色用户')
ON CONFLICT (code) DO NOTHING;

-- 仅 admin 授予角色管理权限
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'role:manage')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;
