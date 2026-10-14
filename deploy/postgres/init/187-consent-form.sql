-- M86-C: 知情同意书
CREATE TABLE IF NOT EXISTS clinical.consent_forms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  consent_type  text NOT NULL CHECK (consent_type IN ('surgery','exam','treatment','blood','anesthesia','other')),
  title         text NOT NULL,
  content       text NOT NULL,
  patient_signature text,
  patient_signed_at timestamptz,
  witness_name  text,
  witness_signature text,
  doctor_signature uuid REFERENCES iam.users(id),
  doctor_signed_at timestamptz,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','signed','witnessed')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consent_visit ON clinical.consent_forms(visit_id);
CREATE INDEX IF NOT EXISTS idx_consent_status ON clinical.consent_forms(status);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('consent:create', '知情同意-开立', 'emr'),
  ('consent:sign', '知情同意-签名', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','consent:create'),
  ('admin','consent:create'),
  ('admin','consent:sign')
ON CONFLICT DO NOTHING;
