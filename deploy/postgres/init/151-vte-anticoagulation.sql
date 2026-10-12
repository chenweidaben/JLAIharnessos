-- ============================================================================
-- 健澜科技 jlmedaios · M46-A VTE 抗凝疗程追踪
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.vte_anticoagulations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id       uuid NOT NULL,
  drug           text NOT NULL CHECK (drug IN ('enoxaparin','heparin','warfarin','rivaroxaban','apixaban')),
  start_date     date NOT NULL,
  end_date       date NULL,
  planned_days   int NOT NULL,
  bleeding_score int NOT NULL DEFAULT 0 CHECK (bleeding_score BETWEEN 0 AND 100),
  active         boolean NOT NULL DEFAULT true,
  note           text NULL,
  created_by     uuid NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vte_anticoag_visit_active ON clinical.vte_anticoagulations(visit_id, active);

ALTER TABLE clinical.clinical_improvement_tasks
  DROP CONSTRAINT IF EXISTS clinical_improvement_tasks_source_check;
ALTER TABLE clinical.clinical_improvement_tasks
  ADD CONSTRAINT clinical_improvement_tasks_source_check
  CHECK (source IN ('drg_attribution','quality_safety','nutrition','pain','anesthesia','icu_sedation','postpartum','rehab','er_green','chronic','chronic_disease','oncology','mental_health','vte','infection','other'));

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('vte:anticoagulate', 'VTE抗凝', 'vte', '启动/停用抗凝疗程（doctor/nurse/admin）'),
  ('vte:view',           'VTE查看', 'vte', '查看抗凝疗程与出血监测（doctor/nurse/admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('admin','vte:anticoagulate'),('doctor','vte:anticoagulate'),('nurse','vte:anticoagulate'),
         ('admin','vte:view'),('doctor','vte:view'),('nurse','vte:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
