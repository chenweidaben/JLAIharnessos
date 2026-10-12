-- ============================================================================
-- 健澜科技 jlmedaios · M46-B 院感自动工单 source CHECK
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

ALTER TABLE clinical.clinical_improvement_tasks
  DROP CONSTRAINT IF EXISTS clinical_improvement_tasks_source_check;
ALTER TABLE clinical.clinical_improvement_tasks
  ADD CONSTRAINT clinical_improvement_tasks_source_check
  CHECK (source IN ('drg_attribution','quality_safety','nutrition','pain','anesthesia','icu_sedation','postpartum','rehab','er_green','chronic','chronic_disease','oncology','mental_health','vte','infection','other'));
