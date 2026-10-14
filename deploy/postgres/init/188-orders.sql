-- M86-D: 医嘱单
CREATE TABLE IF NOT EXISTS clinical.orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  order_type    text NOT NULL CHECK (order_type IN ('medicine','exam','lab','treatment','diet','nursing','other')),
  content       text NOT NULL,
  dosage        text,
  frequency     text,
  route         text,
  start_date    timestamptz NOT NULL DEFAULT now(),
  end_date      timestamptz,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  ordered_by    uuid NOT NULL REFERENCES iam.users(id),
  cancelled_by  uuid REFERENCES iam.users(id),
  cancelled_at  timestamptz,
  cancel_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_visit ON clinical.orders(visit_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON clinical.orders(status);

CREATE TABLE IF NOT EXISTS clinical.order_executions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES clinical.orders(id),
  executed_by uuid NOT NULL REFERENCES iam.users(id),
  executed_at timestamptz NOT NULL DEFAULT now(),
  result      text,
  note        text
);
CREATE INDEX IF NOT EXISTS idx_exec_order ON clinical.order_executions(order_id);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('order:write', '医嘱-开立', 'emr'),
  ('order:cancel', '医嘱-取消', 'emr'),
  ('order:execute', '医嘱-执行', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','order:write'), ('admin','order:write'),
  ('doctor','order:cancel'), ('admin','order:cancel'),
  ('nurse','order:execute'), ('doctor','order:execute'), ('admin','order:execute')
ON CONFLICT DO NOTHING;
