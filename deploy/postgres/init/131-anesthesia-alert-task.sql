-- ============================================================================
-- 健澜科技 jlmedaios · M31-D 麻醉告警自动工单（source='anesthesia'）
-- 扩展 clinical_improvement_tasks.source CHECK 允许 anesthesia。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

ALTER TABLE clinical.clinical_improvement_tasks
  DROP CONSTRAINT IF EXISTS clinical_improvement_tasks_source_check;

ALTER TABLE clinical.clinical_improvement_tasks
  ADD CONSTRAINT clinical_improvement_tasks_source_check
  CHECK (source IN ('drg_attribution','quality_safety','nutrition','pain','anesthesia','other'));
