-- ============================================================================
-- 健澜科技 jlmedaios · M31-C 术后镇痛随访（6h/24h/48h）
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.postop_pain_followups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     uuid NOT NULL REFERENCES clinical.visits(id),
  timepoint    text NOT NULL CHECK (timepoint IN ('6h','24h','48h')),
  due_at       timestamptz NOT NULL,
  completed_at timestamptz,
  pain_score   int CHECK (pain_score IS NULL OR pain_score BETWEEN 0 AND 10),
  work_order_id uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(visit_id, timepoint)
);
CREATE INDEX IF NOT EXISTS idx_postop_due ON clinical.postop_pain_followups(due_at, completed_at);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('postop_followup:view', '术后镇痛随访查看', 'postop', '护士/医生查看术后 6/24/48h 疼痛随访（nurse/doctor/admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (VALUES ('admin','postop_followup:view'),('doctor','postop_followup:view'),('nurse','postop_followup:view')) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
