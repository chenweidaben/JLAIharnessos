-- 健澜科技 jlmedaios - 手术安全核查表（三方核查清单电子化，幂等）
-- 四阶段：pre_op 术前 / anesthesia 麻醉实施前 / pre_incision 切皮前 Time-out / post_op 手术结束后
-- Copyright (c) 2026 杭州健澜科技有限公司

BEGIN;

CREATE SCHEMA IF NOT EXISTS surgery;

CREATE TABLE IF NOT EXISTS surgery.safety_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_id uuid NOT NULL,
  phase text NOT NULL CHECK (phase IN ('pre_op', 'anesthesia', 'pre_incision', 'post_op')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  signed_by uuid,
  signed_at timestamptz DEFAULT now(),
  UNIQUE (surgery_id, phase)
);

CREATE INDEX IF NOT EXISTS idx_safety_checklist_surgery
  ON surgery.safety_checklist (surgery_id);

COMMIT;
