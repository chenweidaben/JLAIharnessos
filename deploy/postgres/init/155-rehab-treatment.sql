-- ============================================================================
-- 健澜科技 jlmedaios · M51-A 康复治疗执行记录
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.rehab_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL,
  modality text NOT NULL CHECK (modality IN ('pt','ot','st','physical','cupping','traction')),
  prescribed_by uuid NOT NULL,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'prescribed'
    CHECK (status IN ('prescribed','signed','completed','missed','cancelled')),
  executed_at timestamptz NULL,
  executed_by uuid NULL,
  efficacy text NULL CHECK (efficacy IS NULL OR efficacy IN ('excellent','good','fair','poor')),
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rehab_treatments_visit_status
  ON clinical.rehab_treatments (visit_id, status);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('rehab_treatment:manage', '康复治疗执行管理', 'rehab', '治疗师开单/签到执行/填疗效'),
  ('rehab_treatment:view', '康复治疗查看', 'rehab', '查看康复治疗单列表')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES
    ('admin','rehab_treatment:manage'),('admin','rehab_treatment:view'),
    ('doctor','rehab_treatment:manage'),('doctor','rehab_treatment:view'),
    ('nurse','rehab_treatment:manage'),('nurse','rehab_treatment:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code = t.r AND rp.permission_code = t.p
);
