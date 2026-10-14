-- M87-B: 病历质控
CREATE TABLE IF NOT EXISTS clinical.medical_qc_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  qc_type      text NOT NULL CHECK (qc_type IN ('round','end','random')),
  checker       uuid NOT NULL REFERENCES iam.users(id),
  check_date    timestamptz NOT NULL DEFAULT now(),
  score         integer CHECK (score >= 0 AND score <= 100),
  errors        jsonb NOT NULL DEFAULT '[]',
  suggestions   text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','rectified','confirmed')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qc_visit ON clinical.medical_qc_records(visit_id);
CREATE INDEX IF NOT EXISTS idx_qc_status ON clinical.medical_qc_records(status);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('medical_qc:check', '病历质控-检查', 'emr'),
  ('medical_qc:view', '病历质控-查看', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin','medical_qc:check'),
  ('doctor','medical_qc:view'), ('admin','medical_qc:view')
ON CONFLICT DO NOTHING;
