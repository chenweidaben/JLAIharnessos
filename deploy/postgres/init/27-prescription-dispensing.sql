-- ============================================================================
-- 健澜科技 jlmedaios · M2-A 处方调剂发药与库存联动
--
--  真实落 PostgreSQL（去 mock）：
--   - clinical.prescription_dispensings 发药/调剂记录（按处方明细、批次、数量、
--       发药人、CDS override 原因），幂等键唯一防重复发药；
--   - clinical.inventory_movements 库存流水（出库为负），库存变动可审计追溯；
--   - clinical.drug_inventory 增加 quantity >= 0 硬约束，应用层原子扣减
--       （UPDATE ... SET quantity = quantity - ? WHERE quantity >= ?），
--       数据库层与应用层双重杜绝超发/负库存。
--
-- 幂等：全部 CREATE TABLE IF NOT EXISTS / ADD CONSTRAINT IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- 1. 发药/调剂记录表 -------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.prescription_dispensings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id  uuid NOT NULL REFERENCES clinical.prescriptions(id),
  item_id          uuid REFERENCES clinical.prescription_items(id),
  drug_id          uuid REFERENCES clinical.drug_catalog(id),
  drug_code        text,
  drug_name        text NOT NULL,
  warehouse        text NOT NULL,
  batch_no         text,
  quantity         numeric(12,2) NOT NULL,
  unit             text,
  dispensed_by     uuid NOT NULL REFERENCES iam.users(id),
  dispensed_at     timestamptz NOT NULL DEFAULT now(),
  idempotency_key  text NOT NULL UNIQUE,
  -- CDS 拦截后医师/药师 override 的原因（无拦截为空；拦截后必须非空）
  override_reason  text,
  -- CDS block 后授权 override 的医师（职责分离：发药人是药师，override 临床决策归医师）
  override_by      uuid REFERENCES iam.users(id),
  cds_hits         jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_disp_rx
  ON clinical.prescription_dispensings(prescription_id);
CREATE INDEX IF NOT EXISTS idx_disp_drug
  ON clinical.prescription_dispensings(drug_id);
CREATE INDEX IF NOT EXISTS idx_disp_override
  ON clinical.prescription_dispensings(override_by);

-- 2. 库存流水（出库为负、入库/盘盈为正）------------------------------------
CREATE TABLE IF NOT EXISTS clinical.inventory_movements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_id       uuid REFERENCES clinical.drug_catalog(id),
  warehouse     text NOT NULL,
  batch_no      text,
  change_qty    numeric(12,2) NOT NULL,          -- 出库为负
  balance_after numeric(12,2),                   -- 变动后该批次结余
  reason        text NOT NULL,                   -- dispense / receive / adjust
  ref_type      text,                            -- prescription ...
  ref_id        uuid,
  actor_id      uuid REFERENCES iam.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_move_drug
  ON clinical.inventory_movements(drug_id, created_at);

-- 3. 库存负库存硬约束（IF NOT EXISTS 写法兼容可重入）------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'clinical.drug_inventory'::regclass
      AND conname = 'drug_inventory_qty_nonneg'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD CONSTRAINT drug_inventory_qty_nonneg CHECK (quantity >= 0);
  END IF;
END $$;
