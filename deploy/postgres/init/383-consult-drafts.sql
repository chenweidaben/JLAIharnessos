-- ============================================================================
-- 健澜AI原生医院操作系统OS · M86 consult-agent 智能咨询助手迁移（380–385）
--
-- 本文件（383）：诊断建议/用药处方 AI 草稿 consult.diagnosis_prescription_drafts；
--   父表 consult.threads（见 380）。
--
-- 医疗安全红线（数据库层强制兜底，应用层 zod 字面量双保险）：
--  - AI 草稿恒需执业医师复核：needs_physician_review = true（CHECK 锁定，禁止写 false）；
--  - 处方草稿恒为非院外处方：is_out_of_hospital_prescription = false（CHECK 锁定，
--    AI 不开具院外处方、不直接生成在院医嘱，须经医师线下/院内系统确认）；
--  - 草稿状态恒为待复核：status = 'pending_review'（CHECK 锁定，不存在 AI 自主 approved 态）；
--  - kind 仅限 diagnosis（诊断建议）/ prescription（用药审方建议）；
--  - 同线程同类型同 draft_hash 唯一，Sentinel 审批网关据此去重，不重复落库；
--  - evidence 为脱敏后证据条目（kind/label/source/snippet），禁止原始入参明文入库。
--
-- 权限码（登记与角色授权见 380-consult-threads.sql 末段）：
--   consult-agent:read 查询草稿；consult-agent:write 生成草稿；复核动作不开放给 AI 写码。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE UNIQUE INDEX IF NOT EXISTS /
--       CREATE INDEX IF NOT EXISTS / DROP TRIGGER IF EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS consult;

-- ---------------------------------------------------------------------------
-- 诊断建议 / 用药处方 AI 草稿（待医师复核；红线布尔与状态由 CHECK 锁定）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consult.diagnosis_prescription_drafts (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id                       uuid NOT NULL REFERENCES consult.threads(id) ON DELETE CASCADE,
  kind                            text NOT NULL CHECK (kind IN ('diagnosis','prescription')),
  title                           text NOT NULL DEFAULT '',
  summary                         text NOT NULL DEFAULT '',
  content                         text NOT NULL DEFAULT '',
  evidence                        jsonb NOT NULL DEFAULT '[]'::jsonb,
  needs_physician_review          boolean NOT NULL DEFAULT true
                                  CHECK (needs_physician_review = true),
  is_out_of_hospital_prescription boolean NOT NULL DEFAULT false
                                  CHECK (is_out_of_hospital_prescription = false),
  status                          text NOT NULL DEFAULT 'pending_review'
                                  CHECK (status = 'pending_review'),
  draft_hash                      text NOT NULL,
  reviewer_id                     uuid REFERENCES iam.users(id),  -- 复核医师（可空：尚未复核）
  reviewed_at                     timestamptz,
  review_note                     text,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_consult_drafts_thread_kind_hash
  ON consult.diagnosis_prescription_drafts(thread_id, kind, draft_hash);
CREATE INDEX IF NOT EXISTS idx_consult_drafts_thread_kind
  ON consult.diagnosis_prescription_drafts(thread_id, kind);
DROP TRIGGER IF EXISTS trg_consult_drafts_updated ON consult.diagnosis_prescription_drafts;
CREATE TRIGGER trg_consult_drafts_updated BEFORE UPDATE ON consult.diagnosis_prescription_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
