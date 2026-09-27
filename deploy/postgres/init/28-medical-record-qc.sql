-- ============================================================================
-- 健澜科技 jlmedaios · M2-B 运行病历质控（三级质控 + AI 辅助）
--
--  真实落 PostgreSQL（去 mock）：
--   - clinical.medical_record_reviews 病历质控记录：
--       科室一级 / 院内二级 / 病案三级的质控结论（pass/return）、
--       质控医师签名、缺陷快照（规则引擎 + AI 辅助分别计数）、
--       整改退回后可反复提交，每次均留痕，形成签名责任链；
--   - 病历状态机复用 medical_records.status：
--       submitted（待质控）→ reviewed（一级通过）/ returned（退回整改）
--       → signed（二级通过）→ archived（三级归档）。
--
-- 职责分离：质控人不得为病历作者本人（应用层强制）；AI 仅辅助，
--   质控结论必须由质控医师本人签名，AI 不产生最终结论。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.medical_record_reviews (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id        uuid NOT NULL REFERENCES clinical.medical_records(id),
  -- 质控级别：1 科室一级 / 2 院内二级 / 3 病案三级
  review_level     smallint NOT NULL,
  -- 质控结论：pass 通过 / return 退回整改
  decision         text NOT NULL,
  reviewer_id      uuid NOT NULL REFERENCES iam.users(id),
  comment          text,
  -- 缺陷快照（规则引擎与 AI 检出的全部问题，供追溯）
  issues           jsonb NOT NULL DEFAULT '[]'::jsonb,
  rule_issue_count integer NOT NULL DEFAULT 0,
  ai_issue_count   integer NOT NULL DEFAULT 0,
  ai_assisted      boolean NOT NULL DEFAULT false,
  ai_model         text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT medical_record_reviews_level_check CHECK (review_level BETWEEN 1 AND 3),
  CONSTRAINT medical_record_reviews_decision_check CHECK (decision IN ('pass', 'return'))
);

CREATE INDEX IF NOT EXISTS idx_mrr_record
  ON clinical.medical_record_reviews(record_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mrr_reviewer
  ON clinical.medical_record_reviews(reviewer_id);