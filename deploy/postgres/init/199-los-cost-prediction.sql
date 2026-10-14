-- M88-E: AI住院天数与费用预测
CREATE TABLE IF NOT EXISTS clinical.los_cost_predictions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  predicted_los_days numeric NOT NULL,
  predicted_cost     numeric NOT NULL,
  risk_level   text NOT NULL CHECK (risk_level IN ('low','medium','high')),
  factors      jsonb NOT NULL DEFAULT '[]',
  confidence   numeric,
  model_version text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lospred_visit ON clinical.los_cost_predictions(visit_id);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('ai_los_pred:view', 'AI预测-住院天数费用', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','ai_los_pred:view'), ('admin','ai_los_pred:view'), ('finance','ai_los_pred:view')
ON CONFLICT DO NOTHING;
