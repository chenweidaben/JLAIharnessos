-- 处方点评：药师对已开立处方的事后点评（合理 / 不合理 / 超常）
-- 健澜科技 jlmedaios
-- 定位：CDS 实时审查（drug_review）之后的人工闭环点评记录；本模块只记录点评结论，
-- 不拦截处方流转、不改变处方审批状态。
CREATE TABLE IF NOT EXISTS clinical.prescription_review (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES clinical.prescriptions(id),
  reviewer_id      uuid REFERENCES iam.users(id),
  result          text CHECK (result IN ('rational','irrational','abnormal')),
  comment         text,
  reviewed_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescription_review_rx ON clinical.prescription_review(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_review_reviewer ON clinical.prescription_review(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_prescription_review_result ON clinical.prescription_review(result);
