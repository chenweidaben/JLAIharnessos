-- ============================================================================
-- 健澜科技杠OS - MFA 持久化收尾（M3-C）
--
-- 15-iam-mfa.sql 已建 iam.mfa_factors（TOTP 因子密文存储）。本迁移补齐：
--  （1）登录第二因子挑战表 iam.mfa_login_challenges：密码校验通过后签发一次性挑战，
--      用户提交 TOTP/备份码后才换发会话令牌；记录失败次数与锁定时间，防暴力破解。
--  （2）权限点 mfa:enroll / mfa:verify，并授予 admin（管理员强制、其余角色自助可选）。
--
-- 幂等可重入；与 PgMfaStore（src/security/mfa/PgMfaStore.ts）配套使用。
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- （1）登录 2FA 挑战
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS iam.mfa_login_challenges (
  challenge_id     uuid PRIMARY KEY DEFAULT gen_random_uuid,
  user_id          uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
  expires_at       timestamptz NOT NULL,
  verified_at      timestamptz,
  failed_attempts integer     NOT NULL DEFAULT 0,
  locked_until     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  iam.mfa_login_challenges IS '登录第二因子（TOTP）一次性挑战：密码通过后签发，验码通过才发会话令牌';
COMMENT ON COLUMN iam.mfa_login_challenges.failed_attempts IS '本挑战连续失败次数，达阈值后锁定';
COMMENT ON COLUMN iam.mfa_login_challenges.locked_until IS '暴力破解锁定截止时间，此前拒绝一切校验';

CREATE INDEX IF NOT EXISTS idx_mfa_challenges_user   ON iam.mfa_login_challenges (user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_expires ON iam.mfa_login_challenges (expires_at);
-- 仅清理未完成的过期挑战（运维/定时清理用）
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_open
  ON iam.mfa_login_challenges (expires_at) WHERE verified_at IS NULL;

-- ----------------------------------------------------------------------------
-- （2）权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('mfa:enroll', 'MFA 绑定/启用', 'iam', '自助为本人账号绑定 TOTP 第二因子'),
  ('mfa:verify', 'MFA 二次校验', 'iam', '登录或敏感操作时完成 TOTP/备份码校验')
ON CONFLICT (code) DO NOTHING;

-- admin 默认强制开启 MFA，授予两个权限点；其余角色可自助 enroll（路由侧校验登录态即可）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code IN ('mfa:enroll', 'mfa:verify')
ON CONFLICT (role_code, permission_code) DO NOTHING;
