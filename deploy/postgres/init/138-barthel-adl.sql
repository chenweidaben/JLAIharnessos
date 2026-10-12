-- ============================================================================
-- 健澜科技 jlmedaios · M35-B Barthel ADL 指数康复评定
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.barthel_assessments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     uuid NOT NULL REFERENCES clinical.visits(id),
  feeding      int NOT NULL CHECK (feeding IN (0,5,10)),
  bathing      int NOT NULL CHECK (bathing IN (0,5)),
  grooming     int NOT NULL CHECK (grooming IN (0,5)),
  dressing     int NOT NULL CHECK (dressing IN (0,5,10)),
  bowel        int NOT NULL CHECK (bowel IN (0,5,10)),
  bladder      int NOT NULL CHECK (bladder IN (0,5,10)),
  toileting    int NOT NULL CHECK (toileting IN (0,5,10)),
  transfer     int NOT NULL CHECK (transfer IN (0,5,10,15)),
  walking      int NOT NULL CHECK (walking IN (0,5,10,15)),
  stairs       int NOT NULL CHECK (stairs IN (0,5,10)),
  total_score  int NOT NULL,
  dependency_level text NOT NULL,
  note         text,
  created_by   uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barthel_visit ON clinical.barthel_assessments(visit_id);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('barthel:assess', 'Barthel ADL 评定录入', 'rehab', '康复师录入 Barthel ADL 评分（nurse/doctor/admin）'),
  ('barthel:view',  'Barthel ADL 查看', 'rehab', '查看 ADL 评定（nurse/doctor/admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('admin','barthel:assess'),('doctor','barthel:assess'),('nurse','barthel:assess'),
         ('admin','barthel:view'),('doctor','barthel:view'),('nurse','barthel:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
