-- ============================================================================
-- 健澜科技 jlmedaios · M34-A 母婴产后访视（产后 1/2/3 天 + 母乳喂养 + 黄疸）
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.postpartum_visits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mother_visit_id   uuid NOT NULL REFERENCES clinical.visits(id),
  baby_visit_id     uuid REFERENCES clinical.visits(id),
  postpartum_day    int NOT NULL CHECK (postpartum_day IN (1,2,3)),
  breastfeeding_score int NOT NULL CHECK (breastfeeding_score BETWEEN 0 AND 3),
  jaundice_tcb      numeric,
  jaundice_visual   text NOT NULL DEFAULT 'none' CHECK (jaundice_visual IN ('none','face','trunk','extremities','generalized')),
  mother_temp_c     numeric,
  note              text,
  created_by        uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mother_visit_id, postpartum_day)
);
CREATE INDEX IF NOT EXISTS idx_postpartum_mother ON clinical.postpartum_visits(mother_visit_id);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('postpartum:assess', '产后访视录入', 'maternal', '护士产后 1/2/3 天访视（nurse/doctor/admin）'),
  ('postpartum:view',   '产后访视查看', 'maternal', '护士/医生查看产后访视（nurse/doctor/admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('admin','postpartum:assess'),('doctor','postpartum:assess'),('nurse','postpartum:assess'),
         ('admin','postpartum:view'),('doctor','postpartum:view'),('nurse','postpartum:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
