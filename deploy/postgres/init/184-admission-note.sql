-- M85-F: 入院记录
CREATE TABLE IF NOT EXISTS clinical.admission_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  chief_complaint text NOT NULL,
  present_illness text NOT NULL,
  past_history  text,
  personal_history text,
  family_history text,
  physical_exam text,
  auxiliary_exam text,
  preliminary_diagnosis text NOT NULL,
  treatment_plan text,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','verified')),
  attending_doctor uuid REFERENCES iam.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(visit_id)
);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('admission_note:write', '入院记录-书写', 'emr'),
  ('admission_note:verify', '入院记录-审核', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','admission_note:write'),
  ('admin','admission_note:write'),
  ('admin','admission_note:verify')
ON CONFLICT DO NOTHING;
