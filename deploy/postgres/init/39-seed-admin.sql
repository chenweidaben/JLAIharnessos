-- ============================================================================
-- 健澜科技 jlmedaios - 系统管理员种子账号（M1-A）
--
--   admin  医务科 系统管理员（role=admin，data_scope=hospital → 全院 all）
--
--   用途：跨科 ADT（转科）、床位维护、审计查看等全院范围操作需要管理员身份；
--   开源演示库固定账号（BFF 试用构建不校验生产口令哈希）。
--   生产部署必须由院方用户中心接管并删除/改密。
--
--   幂等：ON CONFLICT (username) / (user_id, role_code)。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

INSERT INTO iam.users (username, name, employee_no, department, title, role, status)
VALUES ('admin', '系统管理员', 'ADM0001', '医务科', '系统管理员', 'admin', 'active')
ON CONFLICT (username) DO UPDATE
  SET name = EXCLUDED.name,
      employee_no = EXCLUDED.employee_no,
      department = EXCLUDED.department,
      title = EXCLUDED.title,
      role = EXCLUDED.role,
      status = 'active',
      deleted_at = NULL;

INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'admin', 'hospital', NULL
FROM iam.users u
WHERE u.username = 'admin'
ON CONFLICT (user_id, role_code) DO UPDATE
  SET data_scope = 'hospital', scope_value = NULL;
