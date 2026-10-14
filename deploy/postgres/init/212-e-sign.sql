-- ============================================================================
-- 健澜科技 jlmedaios - 电子签名留痕（HASH + 时间戳 + 操作人）
-- 212-e-sign.sql
--
-- 病历/医嘱/处方等关键业务动作的电子签名留痕：
-- 仅存内容摘要（SHA-256），不落明文敏感内容，保证可追溯、防篡改。
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.e_sign_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biz_type     text NOT NULL,                  -- note / order / prescription ...
  biz_id       uuid NOT NULL,                  -- 业务单据 id
  operator_id  uuid NOT NULL,                  -- 操作人
  content_hash text NOT NULL,                  -- 被签内容的 SHA-256 摘要（hex）
  signed_at    timestamptz NOT NULL DEFAULT now(),
  client_ip    text
);

CREATE INDEX IF NOT EXISTS idx_e_sign_log_biz ON clinical.e_sign_log (biz_type, biz_id);
