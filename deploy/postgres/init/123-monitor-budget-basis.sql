-- ============================================================================
-- 健澜科技 jlmedaios · M23-F 在院费用事中监控预算基准（DRG/DIP 双轨）
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

ALTER TABLE clinical.inpatient_cost_monitor
  ADD COLUMN IF NOT EXISTS budget_basis text CHECK (budget_basis IN ('drg', 'dip')) DEFAULT 'drg';
