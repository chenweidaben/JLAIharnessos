-- ============================================================================
-- 健澜科技 jlmedaios · M44-A 精神心理筛查（PHQ-9 + GAD-7）
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.psych_screenings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL,
  phq9_answers  jsonb NOT NULL,
  gad7_answers  jsonb NOT NULL,
  phq9_total    int NOT NULL,
  phq9_level    text NOT NULL,
  gad7_total    int NOT NULL,
  gad7_level    text NOT NULL,
  created_by     uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_psych_visit ON clinical.psych_screenings(visit_id);

ALTER TABLE clinical.clinical_improvement_tasks
  DROP CONSTRAINT IF EXISTS clinical_improvement_tasks_source_check;
ALTER TABLE clinical.clinical_improvement_tasks
  ADD CONSTRAINT clinical_improvement_tasks_source_check
  CHECK (source IN ('drg_attribution','quality_safety','nutrition','pain','anesthesia','icu_sedation','postpartum','rehab','er_green','chronic','oncology','mental_health','other'));

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('psych:screen', '心理筛查', 'psych', 'PHQ-9/GAD-7 录入（nurse/doctor/admin）'),
  ('psych:view',   '心理筛查查看', 'psych', '查看心理筛查（doctor/nurse/admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('admin','psych:screen'),('doctor','psych:screen'),('nurse','psych:screen'),
         ('admin','psych:view'),('doctor','psych:view'),('nurse','psych:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
