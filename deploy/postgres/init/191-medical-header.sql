-- M87-A: 病历首页
CREATE TABLE IF NOT EXISTS clinical.medical_record_headers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL UNIQUE REFERENCES clinical.visits(id),
  patient_name  text NOT NULL,
  gender        text,
  birth_date    date,
  id_card       text,
  admission_date timestamptz NOT NULL,
  discharge_date timestamptz,
  dept_name     text,
  ward_name     text,
  attending_doctor text,
  primary_diagnosis text,
  secondary_diagnoses text[],
  operation_codes text[],
  operation_names text[],
  icd10_codes   text[],
  total_cost    numeric,
  insurance_type text,
  discharge_status text CHECK (discharge_status IN ('cured','improved','not_cured','dead','other')),
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','completed','verified')),
  verified_by   uuid REFERENCES iam.users(id),
  verified_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_header_dept ON clinical.medical_record_headers(dept_name);
CREATE INDEX IF NOT EXISTS idx_header_status ON clinical.medical_record_headers(status);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('medical_header:write', '病历首页-书写', 'emr'),
  ('medical_header:verify', '病历首页-审核', 'emr'),
  ('medical_header:view', '病历首页-查看', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','medical_header:write'), ('admin','medical_header:write'),
  ('admin','medical_header:verify'),
  ('doctor','medical_header:view'), ('admin','medical_header:view')
ON CONFLICT DO NOTHING;
