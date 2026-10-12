-- ============================================================================
-- 健澜科技 jlmedaios · M29-C 护理阳性自动闭环工单（营养/疼痛）
-- 扩展 clinical_improvement_tasks.source CHECK 允许 nutrition/pain。
-- 不新增权限码（复用 improvement_task:assign/handle）。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

ALTER TABLE clinical.clinical_improvement_tasks
  DROP CONSTRAINT IF EXISTS clinical_improvement_tasks_source_check;

ALTER TABLE clinical.clinical_improvement_tasks
  ADD CONSTRAINT clinical_improvement_tasks_source_check
  CHECK (source IN ('drg_attribution','quality_safety','nutrition','pain','other'));
