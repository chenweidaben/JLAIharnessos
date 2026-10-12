-- ============================================================================
-- 健澜科技 jlmedaios · M33-B ICU 镇静异常自动工单（source='icu_sedation'）
-- 扩展 clinical_improvement_tasks.source CHECK 允许 icu_sedation。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

ALTER TABLE clinical.clinical_improvement_tasks
  DROP CONSTRAINT IF EXISTS clinical_improvement_tasks_source_check;

ALTER TABLE clinical.clinical_improvement_tasks
  ADD CONSTRAINT clinical_improvement_tasks_source_check
  CHECK (source IN ('drg_attribution','quality_safety','nutrition','pain','anesthesia','icu_sedation','other'));
