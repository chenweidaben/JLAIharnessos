-- ============================================================================
-- 健澜科技 jlmedaios · M36-A Barthel<40 自动转康复工单（source='rehab'）
-- 扩展 clinical_improvement_tasks.source CHECK 允许 rehab。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

ALTER TABLE clinical.clinical_improvement_tasks
  DROP CONSTRAINT IF EXISTS clinical_improvement_tasks_source_check;

ALTER TABLE clinical.clinical_improvement_tasks
  ADD CONSTRAINT clinical_improvement_tasks_source_check
  CHECK (source IN ('drg_attribution','quality_safety','nutrition','pain','anesthesia','icu_sedation','postpartum','rehab','other'));
