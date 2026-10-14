-- M86-E: 护理记录单
CREATE TABLE IF NOT EXISTS clinical.nursing_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  record_type  text NOT NULL CHECK (record_type IN ('vitals','general','skin','intake_output','other')),
  temperature   numeric,
  pulse        integer,
  respiration   integer,
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  oxygen_saturation numeric,
  intake_ml     numeric,
  output_ml     numeric,
  content       text,
  recorded_by   uuid NOT NULL REFERENCES iam.users(id),
  recorded_at   timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nursing_visit ON clinical.nursing_records(visit_id);
CREATE INDEX IF NOT EXISTS idx_nursing_time ON clinical.nursing_records(recorded_at);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('nursing_record:write', '护理记录-书写', 'emr'),
  ('nursing_record:view', '护理记录-查看', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('nurse','nursing_record:write'), ('admin','nursing_record:write'),
  ('doctor','nursing_record:view'), ('nurse','nursing_record:view'), ('admin','nursing_record:view')
ON CONFLICT DO NOTHING;
