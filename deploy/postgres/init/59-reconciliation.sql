-- ============================================================================
-- 健澜科技 jlmedaios · M3-G 医保对账骨架（本地，不接外部医保）
-- 59-reconciliation.sql
--
-- 把已收费的费用明细（clinical.fee_items）与院内收费目录
-- （clinical.charge_item_catalog.price）逐行重算：
--   expected = quantity * catalog.price；diff = posted_amount - expected；
--   |diff| < 0.01 视为一致(matched)，否则差异(discrepancy)留痕待查。
--
-- 两张表：
--  （1）clinical.reconciliation_runs   一次对账批次（run_no 唯一，幂等重算覆盖），
--     状态机 draft(已生成待复核) -> confirmed(对账确认) / disputed(有差异挂起)。
--  （2）clinical.reconciliation_items 逐行对账明细（run_id 级联删除）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.reconciliation_runs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_no               text NOT NULL UNIQUE,
  period_label         text NOT NULL,
  status               text NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'confirmed', 'disputed')),
  total_items          integer NOT NULL DEFAULT 0,
  matched_items        integer NOT NULL DEFAULT 0,
  discrepancy_items    integer NOT NULL DEFAULT 0,
  total_posted         numeric(14,2) NOT NULL DEFAULT 0,
  total_expected       numeric(14,2) NOT NULL DEFAULT 0,
  created_by           uuid REFERENCES iam.users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  confirmed_by         uuid REFERENCES iam.users(id),
  confirmed_at         timestamptz,
  note                 text,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recon_run_status ON clinical.reconciliation_runs(status, created_at DESC);

CREATE TABLE IF NOT EXISTS clinical.reconciliation_items (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id               uuid NOT NULL REFERENCES clinical.reconciliation_runs(id) ON DELETE CASCADE,
  fee_item_id          uuid REFERENCES clinical.fee_items(id),
  item_code            text,
  item_name            text,
  quantity             numeric(14,2) NOT NULL DEFAULT 1,
  posted_unit_price    numeric(14,2),
  posted_amount        numeric(14,2) NOT NULL DEFAULT 0,
  catalog_price        numeric(14,2),
  expected_amount      numeric(14,2) NOT NULL DEFAULT 0,
  diff                 numeric(14,2) NOT NULL DEFAULT 0,
  matched              boolean NOT NULL DEFAULT false,
  note                 text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recon_item_run ON clinical.reconciliation_items(run_id);
CREATE INDEX IF NOT EXISTS idx_recon_item_matched ON clinical.reconciliation_items(matched);

DROP TRIGGER IF EXISTS trg_recon_run_updated ON clinical.reconciliation_runs;
CREATE TRIGGER trg_recon_run_updated BEFORE UPDATE ON clinical.reconciliation_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('recon:view',    '医保对账查看', 'billing', '查看医保对账批次与逐行明细'),
  ('recon:confirm', '医保对账确认', 'billing', '复核并确认/挂起医保对账批次')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code IN ('recon:view', 'recon:confirm')
ON CONFLICT (role_code, permission_code) DO NOTHING;
