-- ============================================================================
-- 健澜科技 jlmedaios · M41-A 肿瘤随访（化疗周期 + CTCAE 不良反应）
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.chemo_cycles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   uuid NOT NULL REFERENCES clinical.patients(id),
  drug_name    text NOT NULL,
  cycle_no     int NOT NULL,
  planned_date date NOT NULL,
  status       text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','delivered','cancelled')),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chemo_cycles_patient ON clinical.chemo_cycles(patient_id);

CREATE TABLE IF NOT EXISTS clinical.chemo_adverse_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id     uuid NOT NULL REFERENCES clinical.chemo_cycles(id),
  patient_id   uuid NOT NULL REFERENCES clinical.patients(id),
  term         text NOT NULL,
  grade        int NOT NULL CHECK (grade BETWEEN 0 AND 5),
  reported_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chemo_ae_patient ON clinical.chemo_adverse_events(patient_id);

ALTER TABLE clinical.clinical_improvement_tasks
  DROP CONSTRAINT IF EXISTS clinical_improvement_tasks_source_check;
ALTER TABLE clinical.clinical_improvement_tasks
  ADD CONSTRAINT clinical_improvement_tasks_source_check
  CHECK (source IN ('drg_attribution','quality_safety','nutrition','pain','anesthesia','icu_sedation','postpartum','rehab','er_green','chronic','chronic_disease','oncology','mental_health','vte','infection','other'));

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('oncology:manage', '肿瘤随访管理', 'oncology', '化疗周期/不良反应登记（doctor/admin）'),
  ('oncology:view',   '肿瘤随访查看', 'oncology', '查看化疗周期与不良反应（doctor/nurse/admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('admin','oncology:manage'),('doctor','oncology:manage'),
         ('admin','oncology:view'),('doctor','oncology:view'),('nurse','oncology:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
