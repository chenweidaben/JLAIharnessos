-- M85-A: 出院小结闭环
CREATE TABLE IF NOT EXISTS clinical.discharge_summaries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        uuid NOT NULL REFERENCES clinical.visits(id),
  admission_date  timestamptz NOT NULL,
  discharge_date  timestamptz NOT NULL,
  discharge_type  text NOT NULL DEFAULT 'regular' CHECK (discharge_type IN ('regular','transfer','against_advice','eloped','death')),
  discharge_diagnoses text NOT NULL,
  admission_diagnoses  text NOT NULL,
  treatment_course   text NOT NULL,
  discharge_orders   text NOT NULL,
  followup_plan      text,
  attending_doctor   uuid REFERENCES iam.users(id),
  status           text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','verified')),
  submitted_at     timestamptz,
  verified_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(visit_id)
);
CREATE INDEX IF NOT EXISTS idx_discharge_visit ON clinical.discharge_summaries(visit_id);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('discharge_summary:write', '出院小结-书写', 'emr'),
  ('discharge_summary:verify', '出院小结-审核', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','discharge_summary:write'),
  ('admin','discharge_summary:write'),
  ('admin','discharge_summary:verify')
ON CONFLICT DO NOTHING;
