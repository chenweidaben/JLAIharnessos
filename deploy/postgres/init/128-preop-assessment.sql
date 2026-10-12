-- ============================================================================
-- 健澜科技 jlmedaios · M31-A 手术麻醉术前评估
-- clinical.preop_assessments：ASA 分级 + 禁食水/过敏/知情同意三项确认。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.preop_assessments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id    uuid NOT NULL REFERENCES clinical.visits(id),
  surgeon_id  uuid REFERENCES iam.users(id),
  anesthesiologist_id uuid REFERENCES iam.users(id),
  asa_grade   text NOT NULL CHECK (asa_grade IN ('I','II','III','IV','V','VI')),
  npo_confirmed boolean NOT NULL DEFAULT false,
  allergy_checked boolean NOT NULL DEFAULT false,
  consent_signed  boolean NOT NULL DEFAULT false,
  assessment_note text,
  created_by  uuid NOT NULL REFERENCES iam.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_preop_visit ON clinical.preop_assessments(visit_id);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('preop:assess', '术前访视录入', 'preop', '医生/麻醉师术前访视与 ASA 分级（doctor/admin）'),
  ('preop:view',   '术前评估查看', 'preop', '查看术前访视与三项确认（nurse/doctor/admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (VALUES
  ('admin','preop:assess'),('admin','preop:view'),
  ('doctor','preop:assess'),('doctor','preop:view'),
  ('nurse','preop:view')) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
