-- ============================================================================
-- 健澜科技 jlmedaios - 电子签名留痕表（M138-B · 电子签名）
-- 265-e-signature.sql
--
-- 【新业务场景】电子签名（法律效力留痕）
--   覆盖三类临床签署场景：
--     medical_record    病历签名
--     prescription      处方签名
--     surgical_consent  手术同意书签名
--
-- 法律意识：每一次签名都必须可作为电子证据长期追溯，故本表固定留存四要素——
--   ① 签署人 staff_id（谁签的）
--   ② 签署时间 signed_at（何时签的，数据库时钟 now()，不可由前端篡改）
--   ③ 签署来源 client_ip（从哪里签的，由 BFF 从 socket / x-forwarded-for 注入）
--   ④ 签署数据 signature_data + 防篡改指纹 content_hash（签的是什么、事后能否被改）
--
-- 设计要点：
--   - signature_data 存前端手写签名板导出的 PNG（base64 data URL），作为签署动作的
--     可视化凭证；仅存签名笔迹图像，不落病历/处方正文明文，最小化敏感数据面。
--   - content_hash 为 BFF 对「staff_id + document_type + document_id + signature_data
--     + signed_at」做 SHA-256 得到的封存指纹；verifySignature 重算并比对，
--     任一要素被改动即指纹不匹配 → 视为签名失效（防篡改）。
--   - revoked_at 置位即代表该签名被作废（如病历纠错重签），verify 时判 false；
--     不物理删除，保留完整签署历史（法律效力要求留痕不删）。
--
-- 幂等：重复执行不会报错、不会清空已有签名记录。
-- 不触碰 WebSocket，不新增依赖。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

CREATE TABLE IF NOT EXISTS clinical.e_signature (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id       uuid NOT NULL,                          -- 签署人（= iam.users.id）
  document_type  text NOT NULL CHECK (document_type IN
                   ('medical_record','prescription','surgical_consent')),
  document_id    uuid NOT NULL,                          -- 被签业务单据 id
  signature_data text NOT NULL,                          -- 手写签名 PNG（base64 data URL）
  content_hash   text NOT NULL,                          -- 封存指纹 SHA-256（hex）
  client_ip      text,                                   -- 签署来源 IP（法律效力留痕）
  signed_at      timestamptz NOT NULL DEFAULT now(),     -- 签署时间（DB 时钟，防前端篡改）
  revoked_at     timestamptz,                            -- 作废时间；NULL = 有效签名
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- 按单据查历史签名（病历/处方/同意书各自的签署链）
CREATE INDEX IF NOT EXISTS idx_e_signature_doc
  ON clinical.e_signature (document_type, document_id, signed_at);

-- 按签署人检索其全部签署动作（审计/举证）
CREATE INDEX IF NOT EXISTS idx_e_signature_staff
  ON clinical.e_signature (staff_id, signed_at);
