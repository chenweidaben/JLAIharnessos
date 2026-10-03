-- =====================================================================
-- M7-A 统一幂等键框架（Idempotency-Key）
-- =====================================================================
-- 客户端对写请求（POST/PUT/PATCH/DELETE）携带 Idempotency-Key 头，
-- 服务端按「用户 + 幂等键」记录首次请求的响应，重复请求安全重放，
-- 处理中的并发请求返回 409，请求指纹不一致时拒绝。
--
-- 设计要点：
--   · 幂等键按用户隔离（不同用户不可复用同一键）；
--   · 记录请求方法、路径与请求体指纹，防止同键不同请求；
--   · 首次请求先落 processing 占位（唯一约束兜底并发），
--     完成后写回响应状态与响应体；
--   · 仅对带 Idempotency-Key 头的请求生效，其余请求不经过本表。
--
-- 版权所有（c）2026 杭州健澜科技有限公司
-- =====================================================================

CREATE TABLE IF NOT EXISTS clinical.idempotency_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  user_id         text NOT NULL,
  method          text NOT NULL,
  request_path    text NOT NULL,
  request_hash    text NOT NULL,
  status          text NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing','completed')),
  response_status integer,
  response_body   jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  -- 同一用户对同一幂等键仅允许一条记录
  UNIQUE (idempotency_key, user_id)
);

-- 按用户查询其幂等键（含清理过期记录）
CREATE INDEX IF NOT EXISTS idx_idempotency_user_created
  ON clinical.idempotency_keys (user_id, created_at);

COMMENT ON TABLE clinical.idempotency_keys IS
  '统一客户端幂等键记录：首次请求响应缓存与重复请求重放（M7-A）';
