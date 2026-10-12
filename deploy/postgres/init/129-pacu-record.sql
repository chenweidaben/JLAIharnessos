-- ============================================================================
-- 健澜科技 jlmedaios · M31-B PACU 麻醉后复苏记录（Aldrete 评分）
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.pacu_records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id    uuid NOT NULL REFERENCES clinical.visits(id),
  activity    int NOT NULL CHECK (activity BETWEEN 0 AND 2),
  respiration int NOT NULL CHECK (respiration BETWEEN 0 AND 2),
  circulation int NOT NULL CHECK (circulation BETWEEN 0 AND 2),
  consciousness int NOT NULL CHECK (consciousness BETWEEN 0 AND 2),
  spo2        int NOT NULL CHECK (spo2 BETWEEN 0 AND 2),
  entered_at  timestamptz NOT NULL DEFAULT now(),
  exited_at   timestamptz,
  delayed_recovery boolean NOT NULL DEFAULT false,
  discharge_destination text CHECK (discharge_destination IN ('ward','icu','floor','extended_care')),
  note        text,
  created_by  uuid NOT NULL REFERENCES iam.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pacu_visit ON clinical.pacu_records(visit_id);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('pacu:record', 'PACU 复苏记录', 'pacu', '护士在 PACU 记录 Aldrete 评分与出室（nurse/doctor/admin）'),
  ('pacu:view',   'PACU 记录查看', 'pacu', '查看 PACU 复苏记录（nurse/doctor/admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (VALUES
  ('admin','pacu:record'),('admin','pacu:view'),
  ('doctor','pacu:record'),('doctor','pacu:view'),
  ('nurse','pacu:record'),('nurse','pacu:view')) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
