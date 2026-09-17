-- ============================================================================
-- 健澜科技杠OS - 身份与访问（IAM / RBAC + ABAC）
-- 10-iam.sql
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

-- 权限点字典（细粒度操作，配合角色做 ABAC 数据范围控制）
CREATE TABLE iam.permissions (
  code        text PRIMARY KEY,                 -- 如 medical_record:write
  name        text NOT NULL,
  module      text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 角色字典
CREATE TABLE iam.roles (
  code        text PRIMARY KEY,                 -- doctor/nurse/pharmacist/admin/patient/technician/researcher
  name        text NOT NULL,
  description text,
  is_system   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 角色-权限 多对多
CREATE TABLE iam.role_permissions (
  role_code       text NOT NULL REFERENCES iam.roles(code) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES iam.permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_code, permission_code)
);

-- 用户（医护/管理员/患者统一账户；敏感字段加密或脱敏由应用层负责）
CREATE TABLE iam.users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username        text NOT NULL UNIQUE,
  password_hash   text,                          -- bcrypt/argon2 哈希，SSO 用户可空
  name            text NOT NULL,                 -- 姓名（展示用，落库前按策略脱敏/加密）
  employee_no     text UNIQUE,                   -- 工号
  department      text,                          -- 所属科室
  title           text,                          -- 职称
  role            text NOT NULL DEFAULT 'doctor',
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','locked')),
  mfa_enabled     boolean NOT NULL DEFAULT false,
  mfa_secret_enc  text,                          -- MFA 密钥（AES-GCM 加密存储）
  contact_enc     text,                          -- 联系方式（加密）
  last_login_at   timestamptz,
  last_login_ip   inet,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX idx_users_department ON iam.users(department) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_iam_users_updated BEFORE UPDATE ON iam.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 用户-角色 多对多（支持一人多岗，data_scope 限定科室/全院数据范围）
CREATE TABLE iam.user_roles (
  user_id     uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
  role_code   text NOT NULL REFERENCES iam.roles(code) ON DELETE CASCADE,
  data_scope  text NOT NULL DEFAULT 'department' CHECK (data_scope IN ('self','department','hospital','all')),
  scope_value text,                             -- 科室编码等范围值
  granted_at  timestamptz NOT NULL DEFAULT now(),
  granted_by  uuid REFERENCES iam.users(id),
  PRIMARY KEY (user_id, role_code)
);

-- 会话/令牌（刷新令牌与设备管理；JWT 本身无状态，此处用于吊销与审计）
CREATE TABLE iam.sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL,
  device          text,
  ip              inet,
  expires_at      timestamptz NOT NULL,
  revoked_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON iam.sessions(user_id);
CREATE INDEX idx_sessions_expires ON iam.sessions(expires_at);

-- ----------------------------------------------------------------------------
-- 种子：内置角色
-- ----------------------------------------------------------------------------
INSERT INTO iam.roles (code, name, description) VALUES
  ('doctor',     '医生',   '门诊/住院医师，病历、诊断、医嘱、处方'),
  ('nurse',      '护士',   '护理执行、生命体征、危急值接收'),
  ('pharmacist', '药师',   '处方审核、用药指导'),
  ('technician', '技师',   '检验、检查、影像执行与报告'),
  ('admin',      '管理员', '医务/质控/信息科/院级管理'),
  ('researcher', '科研人员','脱敏数据科研分析'),
  ('patient',    '患者',   '患者端服务')
ON CONFLICT (code) DO NOTHING;

-- 权限点种子（与平台关键动作对应）
INSERT INTO iam.permissions (code, name, module) VALUES
  ('medical_record:read',  '病历读取', 'emr'),
  ('medical_record:write', '病历书写', 'emr'),
  ('medical_record:audit', '病历质控', 'qc'),
  ('prescription:write',   '处方开具', 'pharmacy'),
  ('prescription:review',  '处方审核', 'pharmacy'),
  ('order:write',          '医嘱开具', 'order'),
  ('lab:read',             '检验读取', 'lab'),
  ('imaging:read',         '影像读取', 'imaging'),
  ('agent:build',          '智能体搭建', 'platform'),
  ('agent:publish',        '智能体发布', 'platform'),
  ('knowledge:manage',     '知识库管理', 'knowledge'),
  ('report:view',          '管理报表查看', 'operations'),
  ('system:admin',         '系统管理', 'system')
ON CONFLICT (code) DO NOTHING;
