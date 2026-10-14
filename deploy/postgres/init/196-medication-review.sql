-- M88-B: AI合理用药审查
CREATE TABLE IF NOT EXISTS clinical.medication_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  order_id      uuid REFERENCES clinical.orders(id),
  drug_name     text NOT NULL,
  review_type   text NOT NULL CHECK (review_type IN ('interaction','contraindication','dose','duplicate','allergy','pregnancy')),
  severity      text NOT NULL CHECK (severity IN ('info','warning','critical')),
  message       text NOT NULL,
  suggestion    text,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','overridden')),
  reviewed_by   uuid REFERENCES iam.users(id),
  reviewed_at   timestamptz,
  override_reason text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medreview_visit ON clinical.medication_reviews(visit_id);
CREATE INDEX IF NOT EXISTS idx_medreview_status ON clinical.medication_reviews(status);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('med_review:view', '用药审查-查看', 'emr'),
  ('med_review:override', '用药审查-豁免', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','med_review:view'), ('admin','med_review:view'), ('nurse','med_review:view'),
  ('admin','med_review:override')
ON CONFLICT DO NOTHING;
