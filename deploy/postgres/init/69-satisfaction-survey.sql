-- ============================================================================
-- 健澜科技 jlmedaios · M3-O 满意度评价
-- 69-satisfaction-survey.sql
--
-- 患者对就诊/问诊进行满意度评价（多维度评分 + 评论），医护查看统计。
-- 一次就诊/问诊仅可评价一次（部分唯一索引）；评价提交后不可改。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- 注释全角括号。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.satisfaction_surveys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_no       text NOT NULL UNIQUE,
  patient_id      uuid NOT NULL REFERENCES clinical.patients(id),
  visit_id        uuid REFERENCES clinical.visits(id),
  consult_id      uuid REFERENCES clinical.consultation_sessions(id),
  source_type     text NOT NULL DEFAULT 'outpatient'
                    CHECK (source_type IN ('outpatient','inpatient','consultation')),
  overall_score   integer NOT NULL CHECK (overall_score BETWEEN 1 AND 5),
  medical_score   integer NOT NULL CHECK (medical_score BETWEEN 1 AND 5),
  service_score   integer NOT NULL CHECK (service_score BETWEEN 1 AND 5),
  environment_score integer NOT NULL CHECK (environment_score BETWEEN 1 AND 5),
  process_score   integer NOT NULL CHECK (process_score BETWEEN 1 AND 5),
  wait_score      integer NOT NULL CHECK (wait_score BETWEEN 1 AND 5),
  comment         text,
  status          text NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted')),
  -- 提交人可指向 iam.users（医护）或 patient_accounts（患者本人），故不设外键，由应用层记录
  submitted_by    uuid,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 一次就诊仅可评价一次（仅当 visit_id 非空）
CREATE UNIQUE INDEX IF NOT EXISTS uq_satisfaction_visit
  ON clinical.satisfaction_surveys(visit_id)
  WHERE visit_id IS NOT NULL;

-- 一次问诊仅可评价一次（仅当 consult_id 非空）
CREATE UNIQUE INDEX IF NOT EXISTS uq_satisfaction_consult
  ON clinical.satisfaction_surveys(consult_id)
  WHERE consult_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_satisfaction_patient
  ON clinical.satisfaction_surveys(patient_id);

CREATE INDEX IF NOT EXISTS idx_satisfaction_source
  ON clinical.satisfaction_surveys(source_type, submitted_at);

-- ----------------------------------------------------------------------------
-- 权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('satisfaction:view',   '满意度查看统计', 'service', '查看满意度评价与统计分析'),
  ('satisfaction:submit', '满意度评价提交', 'service', '患者本人或医护代提交满意度评价')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE (r.code = 'admin' OR r.code = 'doctor' OR r.code = 'nurse' OR r.code = 'patient')
   AND p.code IN ('satisfaction:view','satisfaction:submit')
ON CONFLICT (role_code, permission_code) DO NOTHING;
