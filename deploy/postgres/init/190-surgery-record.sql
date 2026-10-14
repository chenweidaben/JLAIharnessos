-- M86-F: 手术记录单
CREATE TABLE IF NOT EXISTS clinical.surgery_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  surgery_name  text NOT NULL,
  surgery_date  timestamptz NOT NULL,
  surgeon       uuid NOT NULL REFERENCES iam.users(id),
  assistant1   uuid REFERENCES iam.users(id),
  assistant2   uuid REFERENCES iam.users(id),
  anesthesiologist uuid REFERENCES iam.users(id),
  incision_type text CHECK (incision_type IN ('I','II','III','IV')),
  diagnosis_before text,
  diagnosis_after text,
  procedure_detail text,
  blood_loss   numeric,
  blood_transfusion numeric,
  complications text,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','completed','signed')),
  signed_by    uuid REFERENCES iam.users(id),
  signed_at    timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_surgery_visit ON clinical.surgery_records(visit_id);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('surgery_record:write', '手术记录-书写', 'emr'),
  ('surgery_record:sign', '手术记录-签名', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','surgery_record:write'), ('admin','surgery_record:write'),
  ('admin','surgery_record:sign')
ON CONFLICT DO NOTHING;
