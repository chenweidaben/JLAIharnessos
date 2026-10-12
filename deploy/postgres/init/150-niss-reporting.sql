-- ============================================================================
-- 健澜科技 jlmedaios · M45-A 院内感染上报 NISS
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.nosocomial_infections (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id           uuid NOT NULL,
  infection_type     text NOT NULL CHECK (infection_type IN ('SSI','CRBSI','CAUTI','pneumonia','other')),
  pathogen           text NULL,
  report_date        date NOT NULL DEFAULT CURRENT_DATE,
  status             text NOT NULL DEFAULT 'reported' CHECK (status IN ('reported','under_investigation','resolved','dismissed')),
  isolation_required boolean NOT NULL DEFAULT false,
  note               text NULL,
  reported_by         uuid NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_niss_status_date ON clinical.nosocomial_infections(status, report_date);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('infection:report', '院感上报', 'infection', '上报院内感染（doctor/nurse/admin）'),
  ('infection:view',   '院感查看', 'infection', '查看院感列表与状态流转（doctor/admin/infection_dept）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('admin','infection:report'),('doctor','infection:report'),('nurse','infection:report'),
         ('admin','infection:view'),('doctor','infection:view'),('nurse','infection:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
