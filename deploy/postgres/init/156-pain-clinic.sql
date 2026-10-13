-- ============================================================================
-- 健澜科技 jlmedaios · M52-A 疼痛门诊（癌痛 NRS 滴定/爆发痛/镇痛方案建议）
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.pain_clinic_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  visit_id uuid NULL,
  baseline_nrs int NOT NULL CHECK (baseline_nrs BETWEEN 0 AND 10),
  current_nrs int NOT NULL CHECK (current_nrs BETWEEN 0 AND 10),
  breakthrough_count int NOT NULL DEFAULT 0,
  analgesic text NOT NULL,
  dose_note text NULL,
  titration_round int NOT NULL DEFAULT 1,
  adjustment_suggestion text NULL,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pain_clinic_records_patient
  ON clinical.pain_clinic_records (patient_id);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('pain_clinic:manage', '疼痛门诊管理', 'pain', '登记癌痛NRS滴定/爆发痛/镇痛方案建议'),
  ('pain_clinic:view', '疼痛门诊查看', 'pain', '查看疼痛门诊记录')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES
    ('admin','pain_clinic:manage'),('admin','pain_clinic:view'),
    ('doctor','pain_clinic:manage'),('doctor','pain_clinic:view'),
    ('nurse','pain_clinic:manage'),('nurse','pain_clinic:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code = t.r AND rp.permission_code = t.p
);
