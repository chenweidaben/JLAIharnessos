-- ============================================================================
-- 健澜科技 jlmedaios - 临床员工种子（真实 iam 账户）
-- 35-seed-clinical-staff.sql
--
-- 为门诊工作台提供"真实可登录、可作为医嘱/处方/病历外键"的演示员工：
--   doctor_chen   心血管内科 主任医师（data_scope: 科室）
--   pharmacist_wang 药学部 主任药师（data_scope: 全院，跨科审方）
--
-- 说明：这是开源演示库的固定账号（密码校验在用户中心，BFF 试用构建不校验
-- 生产口令哈希）；生产部署必须由院方用户中心接管并删除/改密。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

INSERT INTO iam.users (username, name, employee_no, department, title, role, status)
VALUES
  ('doctor_chen',    '陈医生', 'DOC1001', '心血管内科', '主任医师', 'doctor', 'active'),
  ('pharmacist_wang','王药师', 'PHA2001', '药学部',     '主任药师', 'pharmacist', 'active')
ON CONFLICT (username) DO UPDATE
  SET name = EXCLUDED.name,
      employee_no = EXCLUDED.employee_no,
      department = EXCLUDED.department,
      title = EXCLUDED.title,
      role = EXCLUDED.role,
      status = 'active',
      deleted_at = NULL;

-- 用户-角色与数据范围（幂等：先按 username 定位用户）
INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'doctor', 'department', '心血管内科'
FROM iam.users u
WHERE u.username = 'doctor_chen'
ON CONFLICT (user_id, role_code) DO UPDATE
  SET data_scope = 'department', scope_value = '心血管内科';

INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'pharmacist', 'hospital', NULL
FROM iam.users u
WHERE u.username = 'pharmacist_wang'
ON CONFLICT (user_id, role_code) DO UPDATE
  SET data_scope = 'hospital', scope_value = NULL;
