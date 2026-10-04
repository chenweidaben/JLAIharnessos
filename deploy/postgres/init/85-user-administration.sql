-- =====================================================================
-- M8-A 用户管理（User Administration）
-- =====================================================================
-- 系统管理中的用户管理原先在前端使用本地 mock。本迁移补齐用户管理
-- 所需的账户字段，并新增用户管理权限，使管理员能够：
--   · 新增/编辑账户，分配多个角色与数据范围；
--   · 启用/禁用、休假、重置密码、软删除；
--   · 全部操作落哈希链审计。
--
-- 设计要点：
--   · 性别、邮箱、手机、职务为账户扩展属性（手机在应用层按策略脱敏）；
--   · status 增加 leave（休假）；离职走软删除 deleted_at；
--   · 多角色与数据范围沿用 iam.user_roles；
--   · 密码使用 PBKDF2-SHA512（NIST 推荐），不存明文。
--
-- 版权所有（c）2026 杭州健澜科技有限公司
-- =====================================================================

-- 账户扩展字段
ALTER TABLE iam.users ADD COLUMN IF NOT EXISTS gender   text NOT NULL DEFAULT 'unknown';
ALTER TABLE iam.users ADD COLUMN IF NOT EXISTS email    text;
ALTER TABLE iam.users ADD COLUMN IF NOT EXISTS phone    text;
ALTER TABLE iam.users ADD COLUMN IF NOT EXISTS position text;

-- 状态增加 leave（休假）；离职走软删除
ALTER TABLE iam.users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE iam.users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'disabled', 'locked', 'leave'));

COMMENT ON COLUMN iam.users.gender IS '性别（male/female/unknown）';
COMMENT ON COLUMN iam.users.email  IS '工作邮箱';
COMMENT ON COLUMN iam.users.phone  IS '联系手机（应用层脱敏展示）';

-- 用户管理权限码
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('user:manage', '用户管理', 'system',
     '新增/编辑账户、分配角色与数据范围、启禁用、重置密码、删除')
ON CONFLICT (code) DO NOTHING;

-- 仅 admin 授予用户管理权限
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'user:manage')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;
