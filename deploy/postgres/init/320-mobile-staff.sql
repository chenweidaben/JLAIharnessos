-- ============================================================================
-- 健澜科技 jlmedaios · M158-B 医生移动工作站（移动端会话与推送令牌）
-- ----------------------------------------------------------------------------
--  本迁移仅建立一张移动端会话/推送令牌表 mobile_session，并登记两个移动端
--  权限码，不新建任何业务表、不改动既有列：
--   - mobile_staff:home           医生/护士在移动端 H5/PWA 拉取工作台首页
--   - mobile_staff:push_register  移动端登记/续期设备推送令牌（APNs/FCM/Web）
--
--  设计要点（v4.x近期）：
--   · device_token 为各推送通道的原始令牌（APNs hex / FCM JWT / Web Push
--     endpoint 摘要），落库前由 BFF 纯函数 registerPushToken 完成格式校验；
--   · (staff_id, platform, device_token) 唯一，同一设备重复登记走 UPSERT 续期，
--     防止令牌表膨胀与一人多机串扰；
--   · expires_at 为空表示长期有效；过期记录由清理任务按索引回收，不删历史；
--   · last_active_at 每次首页拉取/令牌续期刷新，用于「最近在线设备」审计；
--   · 医疗安全：令牌仅用于通知（危急值/会诊/审批）触达，不下发任何写权限，
--     医嘱/病历等写操作仍走原 PC 端鉴权链路；本迁移不触碰 WebSocket。
--
--  幂等：CREATE TABLE IF NOT EXISTS / INSERT ... ON CONFLICT DO NOTHING，
--  可重复执行。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.mobile_session (
  id              BIGSERIAL PRIMARY KEY,
  staff_id        text        NOT NULL,
  device_token    text        NOT NULL,
  platform        text        NOT NULL DEFAULT 'web',
  app_version     text,
  dedup_key       text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_active_at  timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz
);

-- 同一人同一设备同一令牌唯一：重复登记视为续期，不产生重复推送
CREATE UNIQUE INDEX IF NOT EXISTS uq_mobile_session_token
  ON clinical.mobile_session (staff_id, platform, device_token);

-- 按人查询其全部移动设备（在线设备审计 / 批量停用）
CREATE INDEX IF NOT EXISTS idx_mobile_session_staff
  ON clinical.mobile_session (staff_id, last_active_at DESC);

-- 过期令牌回收：仅扫未过期/临期集
CREATE INDEX IF NOT EXISTS idx_mobile_session_expires
  ON clinical.mobile_session (expires_at)
  WHERE expires_at IS NOT NULL;

COMMENT ON TABLE clinical.mobile_session IS
  '医生/护士移动端会话与推送令牌台账：首页拉取、APNs/FCM/Web 令牌续期（M158-B，v4.x近期）';

-- ---------------------------------------------------------------------------
-- 权限码登记（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('mobile_staff:home', '医生移动工作站首页', 'clinical',
   '医生/护士在移动端 H5/PWA 拉取今日待办、分管患者、快捷操作与消息通知'),
  ('mobile_staff:push_register', '移动推送令牌登记', 'clinical',
   '移动端登记或续期设备推送令牌，用于危急值/会诊/审批通知触达')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：医生为主，护士/管理员兜底
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('doctor', 'mobile_staff:home'),
  ('doctor', 'mobile_staff:push_register'),
  ('nurse',  'mobile_staff:home'),
  ('nurse',  'mobile_staff:push_register'),
  ('admin',  'mobile_staff:home'),
  ('admin',  'mobile_staff:push_register')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;
