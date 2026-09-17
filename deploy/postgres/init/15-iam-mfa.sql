-- ============================================================================
-- 健澜科技杠OS - 多因素认证（MFA/TOTP）持久化
--
-- 存储用户 TOTP 因子：密钥以密文落库（secret_cipher，应用层 AES-256-GCM），
-- 备份码仅存 SHA-256 哈希（backup_hashes），last_used_counter 用于拒绝同一口令重放。
-- 进程内默认实现仅适用于单机/演示；多副本生产部署必须使用 iam.mfa_factors。
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

CREATE TABLE IF NOT EXISTS iam.mfa_factors (
  user_id             TEXT PRIMARY KEY,
  secret_cipher       TEXT NOT NULL,
  enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  issuer              TEXT NOT NULL,
  account_name        TEXT NOT NULL,
  backup_hashes       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  last_used_counter   BIGINT,
  created_at          BIGINT NOT NULL,
  confirmed_at        BIGINT,
  updated_at          BIGINT NOT NULL
);

COMMENT ON TABLE  iam.mfa_factors IS 'MFA/TOTP 因子（密钥密文存储，备份码仅存哈希）';
COMMENT ON COLUMN iam.mfa_factors.secret_cipher IS 'TOTP 密钥密文（应用层 AES-256-GCM 封装）';
COMMENT ON COLUMN iam.mfa_factors.backup_hashes IS '一次性备份码的 SHA-256 哈希数组';
COMMENT ON COLUMN iam.mfa_factors.last_used_counter IS '最近成功 TOTP 绝对计数器，用于重放拒绝';

-- 仅统计启用 MFA 的用户（低基数运维查询）
CREATE INDEX IF NOT EXISTS idx_mfa_factors_enabled ON iam.mfa_factors (enabled) WHERE enabled = TRUE;
