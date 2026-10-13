-- 健澜科技 jlmedaios - 患者满意度调查扩展（M63-A，幂等）
-- 复用 M3-O 既有 clinical.satisfaction_surveys（已有 medical/environment/comment/visit_id/submitted_by），
-- 补 4 维度中的护理/后勤维度与科室列，支持科室汇总排名。

BEGIN;

ALTER TABLE clinical.satisfaction_surveys
  ADD COLUMN IF NOT EXISTS nursing_score int,
  ADD COLUMN IF NOT EXISTS logistics_score int,
  ADD COLUMN IF NOT EXISTS department text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'satisfaction_surveys_nursing_score_check') THEN
    ALTER TABLE clinical.satisfaction_surveys
      ADD CONSTRAINT satisfaction_surveys_nursing_score_check CHECK (nursing_score IS NULL OR nursing_score BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'satisfaction_surveys_logistics_score_check') THEN
    ALTER TABLE clinical.satisfaction_surveys
      ADD CONSTRAINT satisfaction_surveys_logistics_score_check CHECK (logistics_score IS NULL OR logistics_score BETWEEN 1 AND 5);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_satisfaction_dept_created
  ON clinical.satisfaction_surveys (department, created_at DESC);

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('satisfaction:submit', '满意度提交', 'nursing', '患者提交满意度问卷'),
  ('satisfaction:view', '满意度查看', 'nursing', '查看满意度汇总与排名')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('satisfaction:view')) AS p(permission_code)
WHERE r.code IN ('admin', 'doctor', 'nurse')
ON CONFLICT DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('satisfaction:submit')) AS p(permission_code)
WHERE r.code = 'patient'
ON CONFLICT DO NOTHING;

COMMIT;
