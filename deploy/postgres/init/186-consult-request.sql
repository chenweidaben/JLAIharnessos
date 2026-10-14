-- M86-B: 会诊记录单
CREATE TABLE IF NOT EXISTS clinical.consult_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  consult_type  text NOT NULL CHECK (consult_type IN ('routine','urgent','emergency')),
  requesting_dept text NOT NULL,
  requesting_doctor uuid NOT NULL REFERENCES iam.users(id),
  consulting_dept text NOT NULL,
  reason        text NOT NULL,
  clinical_info text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','completed','cancelled')),
  accepted_at   timestamptz,
  accepted_by   uuid REFERENCES iam.users(id),
  consult_note  text,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consult_status ON clinical.consult_requests(status);
CREATE INDEX IF NOT EXISTS idx_consult_visit ON clinical.consult_requests(visit_id);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('consult:request', '会诊-申请', 'emr'),
  ('consult:respond', '会诊-应答', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','consult:request'),
  ('admin','consult:request'),
  ('doctor','consult:respond'),
  ('admin','consult:respond')
ON CONFLICT DO NOTHING;
