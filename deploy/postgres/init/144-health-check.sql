-- ============================================================================
-- 健澜科技 jlmedaios · M40-A 体检中心
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.health_check_packages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  items        text[] NOT NULL,
  price_cents  int NOT NULL,
  active       boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS clinical.health_check_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id      uuid NOT NULL REFERENCES clinical.health_check_packages(id),
  patient_id      uuid NOT NULL REFERENCES clinical.patients(id),
  appointment_date date NOT NULL,
  status          text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','in_progress','completed','reported')),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hc_orders_patient ON clinical.health_check_orders(patient_id);

CREATE TABLE IF NOT EXISTS clinical.health_check_order_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES clinical.health_check_orders(id),
  item_name     text NOT NULL,
  completed     boolean NOT NULL DEFAULT false,
  completed_at  timestamptz,
  UNIQUE(order_id, item_name)
);
CREATE INDEX IF NOT EXISTS idx_hc_items_order ON clinical.health_check_order_items(order_id);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('healthcheck:manage', '体检中心管理', 'healthcheck', '套餐维护/开单/完成项目（admin）'),
  ('healthcheck:view',  '体检中心查看', 'healthcheck', '查看体检单（admin/doctor/nurse）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('admin','healthcheck:manage'),
         ('admin','healthcheck:view'),('doctor','healthcheck:view'),('nurse','healthcheck:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
