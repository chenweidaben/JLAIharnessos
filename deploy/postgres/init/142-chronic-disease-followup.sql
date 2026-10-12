-- ============================================================================
-- 健澜科技 jlmedaios · M39-A 慢病管理（高血压/糖尿病随访）
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.chronic_followup_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES clinical.patients(id),
  disease         text NOT NULL CHECK (disease IN ('hypertension','diabetes')),
  target_sbp      int,
  target_dbp      int,
  target_hba1c    numeric,
  next_followup_at timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chronic_plans_patient ON clinical.chronic_followup_plans(patient_id);

CREATE TABLE IF NOT EXISTS clinical.chronic_vitals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES clinical.patients(id),
  sbp             int,
  dbp             int,
  fasting_glucose numeric,
  hba1c           numeric,
  measured_at     timestamptz NOT NULL DEFAULT now(),
  note            text,
  created_by      uuid NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chronic_vitals_patient ON clinical.chronic_vitals(patient_id);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('chronic:manage', '慢病随访管理', 'chronic', '建随访计划/录血压血糖（doctor/admin）'),
  ('chronic:view',  '慢病随访查看', 'chronic', '查看慢病随访（doctor/nurse/admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('admin','chronic:manage'),('doctor','chronic:manage'),
         ('admin','chronic:view'),('doctor','chronic:view'),('nurse','chronic:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);

ALTER TABLE clinical.clinical_improvement_tasks
  DROP CONSTRAINT IF EXISTS clinical_improvement_tasks_source_check;
ALTER TABLE clinical.clinical_improvement_tasks
  ADD CONSTRAINT clinical_improvement_tasks_source_check
  CHECK (source IN ('drg_attribution','quality_safety','nutrition','pain','anesthesia','icu_sedation','postpartum','rehab','er_green','chronic','chronic_disease','oncology','mental_health','vte','infection','other'));
