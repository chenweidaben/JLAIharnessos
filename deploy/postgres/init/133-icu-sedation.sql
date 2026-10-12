-- ============================================================================
-- 健澜科技 jlmedaios · M33-A ICU RASS 镇静评分
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.icu_sedation_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     uuid NOT NULL REFERENCES clinical.visits(id),
  rass_score   int NOT NULL CHECK (rass_score BETWEEN -5 AND 4),
  target_rass  int NOT NULL DEFAULT -1 CHECK (target_rass BETWEEN -5 AND 1),
  on_ventilator boolean NOT NULL DEFAULT false,
  sedative_drug text,
  note         text,
  created_by   uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_icu_sed_visit ON clinical.icu_sedation_records(visit_id);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('icu_sedation:assess', 'ICU 镇静评分录入', 'icu', '护士录入 RASS 镇静评分（nurse/doctor/admin）'),
  ('icu_sedation:view',   'ICU 镇静评分查看', 'icu', '护士/医生查看 RASS 评分（nurse/doctor/admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('admin','icu_sedation:assess'),('doctor','icu_sedation:assess'),('nurse','icu_sedation:assess'),
         ('admin','icu_sedation:view'),('doctor','icu_sedation:view'),('nurse','icu_sedation:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
