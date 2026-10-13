-- 健澜科技 jlmedaios - 输液港/PICC 维护记录（M68-A，幂等）

BEGIN;

CREATE TABLE IF NOT EXISTS clinical.picc_maintenances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  device_type text NOT NULL CHECK (device_type IN ('picc', 'port')),
  inserted_at date NOT NULL,
  last_maintained_at date NOT NULL,
  dressing_changed boolean NOT NULL DEFAULT false,
  flushed boolean NOT NULL DEFAULT false,
  complication text CHECK (complication IN ('none', 'thrombosis', 'infection', 'dislodged', 'occluded')),
  notes text,
  nurse uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_picc_patient_maintained
  ON clinical.picc_maintenances (patient_id, last_maintained_at);

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('picc:maintain', 'PICC 维护', 'nursing', '录入输液港/PICC 维护记录'),
  ('picc:view', 'PICC 查看', 'nursing', '查看输液港/PICC 维护记录')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('picc:maintain'), ('picc:view')) AS p(permission_code)
WHERE r.code IN ('admin', 'doctor', 'nurse')
ON CONFLICT DO NOTHING;

COMMIT;
