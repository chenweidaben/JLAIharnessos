-- ============================================================================
-- 健澜科技 jlmedaios · M139-C 物资耗材管理（医院运营管理）
--
-- 业务定位：
--   面向总务/物资科的一次性耗材、消毒用品、检验试剂、办公用品的台账管理。
--   核心红线：库存准确、账实相符——出库不允许形成负库存，每一笔出入库都留痕可追溯。
--
-- 表结构：
--   clinical.supply_item        物资目录 + 当前在库存（item 主数据，含安全库存阈值）
--   clinical.supply_stock_ledger 出入库流水（一笔一账，用于账实核对与盘点追溯）
--
-- 物资类别 category 仅允许四类：
--   disposable  一次性耗材
--   disinfect   消毒用品
--   reagent     检验试剂
--   office      办公用品
--
-- 安全红线：
--   - quantity 为在库存数量，CHECK 约束 >= 0，数据库层杜绝负库存（账实不符）；
--   - ledger 流水与 item.quantity 由应用侧事务同写，禁止只更总账不留流水；
--   - 幂等：重复执行不会报错、不会清空已有数据。
-- 不触碰 WebSocket。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ----------------------------------------------------------------------------
-- 物资目录与在库存主表
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.supply_item (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code     text NOT NULL UNIQUE,                 -- 物资编码（业务唯一键）
  name          text NOT NULL,                        -- 物资名称
  category      text NOT NULL CHECK (category IN ('disposable','disinfect','reagent','office')),
  unit          text NOT NULL DEFAULT '个',           -- 计量单位
  quantity      integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),  -- 当前在库存（杜绝负库存）
  safety_stock  integer NOT NULL DEFAULT 0 CHECK (safety_stock >= 0), -- 安全库存阈值
  batch_no      text,                                 -- 当前批次（可空）
  expiry_date   date,                                 -- 效期（试剂类，可空）
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supply_item_category ON clinical.supply_item(category);

-- ----------------------------------------------------------------------------
-- 出入库流水（账实核对的依据）
--   direction  in=入库 out=出库
--   patient_id 出库关联患者（可空，办公用品出库为空）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.supply_stock_ledger (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      uuid NOT NULL REFERENCES clinical.supply_item(id),
  direction    text NOT NULL CHECK (direction IN ('in','out')),
  quantity     integer NOT NULL CHECK (quantity > 0),
  batch_no     text,
  dept         text,                                   -- 出库领用科室（入库可空）
  patient_id   text,                                   -- 出库关联患者（可空）
  balance_after integer NOT NULL CHECK (balance_after >= 0),  -- 本笔完成后的在库存
  operated_by  uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supply_ledger_item ON clinical.supply_stock_ledger(item_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 权限：物资管理仅 admin（总务/物资科）可写，相关角色可读
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('supply:manage', '物资出入库登记', 'ops', '物资入库/出库登记（admin）'),
  ('supply:view',   '物资库存查看',   'ops', '查看物资库存与低库存预警（admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('admin','supply:manage'),('admin','supply:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.role_code = t.r AND rp.permission_code = t.p
);
