-- ============================================================================
-- 健澜科技 jlmedaios - M129-B 第三方对接 API Key 台账（系统集成）
--
-- 【系统集成】面向第三方机构（区域卫生平台、医联体协同、合作药企/检验机构）
-- 的开放接口凭证管理：
--   - 每个对接方持有一把独立 API Key，默认 90 天过期；
--   - Key 明文仅在创建时返回一次，库内只存 SHA-256 哈希，杜绝明文泄露；
--   - 权限按最小粒度授权（patient:read / patient:visits:read /
--     patient:prescriptions:read），一把 Key 只能访问被授权的数据面；
--   - 支持随时吊销（status='revoked'）与过期自动失效，不依赖人工清理。
--
-- 表结构：
--   medmuse.api_keys
--     id            bigserial    主键
--     key_prefix    text         Key 展示前缀（jlsk_live_ab12…，用于后台识别，非凭证）
--     key_hash      text         Key 明文的 SHA-256 hex（唯一索引；绝不存明文）
--     name          text         对接方名称（如：区域卫生平台 / 医联体-浙北院区）
--     permissions   text[]       授权权限码白名单子集
--     status        text         active / revoked（吊销后立即失效）
--     expires_at    timestamptz  过期时刻（默认创建后 90 天，由 BFF 计算写入）
--     created_by    text         创建人工号（仅 admin）
--     created_at    timestamptz  创建时刻
--     last_used_at  timestamptz  最近一次校验通过时刻（BFF 每次请求回写）
--     revoked_at    timestamptz  吊销时刻
--     note          text         用途说明 / 联系人
--
-- 医疗安全红线（系统集成）：
--   - 凭证只存哈希：泄漏库表也无法反推可用 Key；
--   - 过期即拒：expires_at 由 BFF 以 now() 实时比较，过期 Key 与吊销 Key 同路径拒绝；
--   - 只读最小集：本表不存患者数据，仅存凭证元数据；患者数据面权限由
--     permissions 数组收敛，开放接口出口再做字段级脱敏。
--
-- 兼容：CREATE SCHEMA / TABLE IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 第三方对接 API Key 台账
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.api_keys (
  id           bigserial PRIMARY KEY,
  key_prefix   text        NOT NULL,
  key_hash     text        NOT NULL,
  name         text        NOT NULL,
  permissions  text[]      NOT NULL DEFAULT '{}',
  status       text        NOT NULL DEFAULT 'active',
  expires_at   timestamptz NOT NULL,
  created_by   text        NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at   timestamptz,
  note         text        NOT NULL DEFAULT ''
);

-- 凭证校验主路径：按哈希精确命中，唯一约束防碰撞
CREATE UNIQUE INDEX IF NOT EXISTS uk_api_keys_key_hash
  ON medmuse.api_keys (key_hash);

-- 有效凭证收敛查询：status='active' AND expires_at > now()
CREATE INDEX IF NOT EXISTS idx_api_keys_status_expires
  ON medmuse.api_keys (status, expires_at);

-- 后台列表按创建时间倒序
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at
  ON medmuse.api_keys (created_at DESC);

-- 行级注释（运维可读）
COMMENT ON TABLE  medmuse.api_keys               IS '【系统集成】第三方对接 API Key 台账；只存哈希，不存明文，默认 90 天过期';
COMMENT ON COLUMN medmuse.api_keys.key_hash     IS 'Key 明文的 SHA-256 hex；库内唯一敏感列，禁止 SELECT * 下发';
COMMENT ON COLUMN medmuse.api_keys.permissions IS '权限码白名单子集：patient:read / patient:visits:read / patient:prescriptions:read';
COMMENT ON COLUMN medmuse.api_keys.status      IS 'active=可用；revoked=已吊销（立即失效，不可恢复，需重新签发）';
