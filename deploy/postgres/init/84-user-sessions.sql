-- =====================================================================
-- M7-F 会话管理与 JWT 主动吊销（Session & Token Revocation）
-- =====================================================================
-- JWT 是无状态令牌，默认在过期前始终有效；医院大量使用共享工作站，
-- 仅靠前端清除令牌无法阻止已签发令牌被继续使用。M7-F 为每次登录
-- 建立服务端会话，认证中间件校验会话是否仍有效，从而支持：
--   · 主动登出：立即吊销本次访问令牌；
--   · 管理员强制下线：按用户或会话吊销；
--   · 刷新轮换：旧会话随 refresh 轮换而失效；
--   · 在线会话审计：谁、何时、从哪个终端登录。
--
-- 设计要点：
--   · jti 为访问令牌唯一标识（JWT ID），与令牌一一对应；
--   · 同时记录 refresh_jti，支持刷新令牌一并吊销；
--   · revoked_at 为空表示会话有效，非空表示已吊销及原因；
--   · 过期但未显式吊销的会话由活跃索引与清理任务定期回收。
--
-- 版权所有（c）2026 杭州健澜科技有限公司
-- =====================================================================

CREATE TABLE IF NOT EXISTS clinical.user_sessions (
  id                 BIGSERIAL PRIMARY KEY,
  jti                text NOT NULL UNIQUE,
  refresh_jti        text,
  user_id            text NOT NULL,
  issued_at          timestamptz NOT NULL DEFAULT now(),
  access_expires_at  timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL,
  revoked_at         timestamptz,
  revoke_reason      text,
  ip                 text,
  user_agent         text
);

-- 按用户查询其会话（最新在前）
CREATE INDEX IF NOT EXISTS idx_user_sessions_user
  ON clinical.user_sessions (user_id, issued_at DESC);

-- 活跃会话（未吊销）按过期时间排列，供清理与在线统计使用
CREATE INDEX IF NOT EXISTS idx_user_sessions_active
  ON clinical.user_sessions (access_expires_at)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE clinical.user_sessions IS
  '登录会话与 JWT 主动吊销台账：jti 校验、登出/强制下线、刷新轮换（M7-F）';

-- 管理权限码：在线会话查看与强制下线（仅 admin）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('session:manage', '会话管理与强制下线', 'session',
     '查看在线会话、强制下线用户、吊销已签发令牌')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'session:manage')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;
