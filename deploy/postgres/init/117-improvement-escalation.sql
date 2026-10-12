-- ============================================================================
-- 健澜科技 jlmedaios · M22-F 整改无效自动升级闭环
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

ALTER TABLE clinical.clinical_improvement_tasks ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES clinical.clinical_improvement_tasks(id);
ALTER TABLE clinical.clinical_improvement_tasks ADD COLUMN IF NOT EXISTS escalation_level int NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_improvement_parent ON clinical.clinical_improvement_tasks(parent_task_id);
