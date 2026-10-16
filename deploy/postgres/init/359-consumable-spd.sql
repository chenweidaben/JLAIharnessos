-- ============================================================================
-- 健澜科技 jlmedaios · M177-D 医院耗材管理深化——SPD 物流
-- 359-consumable-spd.sql
--
-- 业务定位（病案设备耗材域）：
--   在 269-supply.sql（总务物资台账：disposable/disinfect/reagent/office）基础上，
--   把「医用耗材」升级为 SPD（Supply Processing Distribution，医院供应链物流）模式：
--     采购：科室申请 + 采购订单 + 到货验收；
--     库存：一级库（中心库房）+ 二级库（科室库房）+ 消耗点（手术室/治疗车）；
--     使用：扫码领用 + 消耗记录 + HMS 计费；
--     结算：按实际消耗（PPV）与供应商结算，而非按入库量。
--
-- 核心红线：高值耗材一物一码追溯，不能漏。
--   - 高值耗材（冠脉支架/人工关节/心脏起搏器/人工晶体/骨科钢板等）必须挂 UDI
--     与唯一序列号（serial_no），从供应商 → 一级库 → 二级库 → 消耗点 → 患者
--     全程留痕；任何高值件缺码即视为追溯断链，由 BFF 纯函数 identifyHighValueConsumables
--     显式标记为 missing_trace（漏追溯），不允许静默放行。
--
-- 设计边界：
--   - 仅扩展 clinical.supply_item（幂等 ADD COLUMN IF NOT EXISTS），不破坏 269 既有数据；
--   - 新增高值追溯流水表 clinical.supply_highvalue_trace（一件一行，按 serial_no 主键）；
--   - quantity（在库总量）= level1_qty + level2_qty + point_qty，由应用侧事务同写；
--   - 不触碰 WebSocket；不新增依赖。
--
-- 幂等：ALTER TABLE ... ADD COLUMN IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ---------------------------------------------------------------------------
-- 一、supply_item 表 SPD 扩展列（病案设备耗材域）
-- ---------------------------------------------------------------------------
ALTER TABLE clinical.supply_item
  ADD COLUMN IF NOT EXISTS spd_enabled        boolean NOT NULL DEFAULT false,          -- 是否纳入 SPD 物流管理
  ADD COLUMN IF NOT EXISTS value_level        text    NOT NULL DEFAULT 'low'          -- 价值等级：high 高值 / medium 中值 / low 低值
                                                  CHECK (value_level IN ('high','medium','low')),
  ADD COLUMN IF NOT EXISTS udi_code          text    NOT NULL DEFAULT '',            -- 医疗器械唯一标识（UDI-DI）
  ADD COLUMN IF NOT EXISTS is_traceable       boolean NOT NULL DEFAULT false,         -- 是否一物一码追溯（高值必为 true）
  ADD COLUMN IF NOT EXISTS serial_no          text    NOT NULL DEFAULT '',            -- 单品唯一序列号（一物一码；低值可空串）
  ADD COLUMN IF NOT EXISTS supplier_name      text    NOT NULL DEFAULT '',            -- 供应商名称
  ADD COLUMN IF NOT EXISTS unit_price         numeric(12,2) NOT NULL DEFAULT 0.00,    -- 单价（元），用于高值判定与 PPV 结算
  ADD COLUMN IF NOT EXISTS level1_qty         integer NOT NULL DEFAULT 0 CHECK (level1_qty >= 0),   -- 一级库（中心库房）在库
  ADD COLUMN IF NOT EXISTS level2_qty         integer NOT NULL DEFAULT 0 CHECK (level2_qty >= 0),   -- 二级库（科室库房）在库
  ADD COLUMN IF NOT EXISTS point_qty          integer NOT NULL DEFAULT 0 CHECK (point_qty >= 0),   -- 消耗点（手术室/治疗车）在库
  ADD COLUMN IF NOT EXISTS ref_order_point     integer NOT NULL DEFAULT 0 CHECK (ref_order_point >= 0), -- 建议补货点（再订货点）
  ADD COLUMN IF NOT EXISTS max_stock          integer NOT NULL DEFAULT 0 CHECK (max_stock >= 0),    -- 最高库存（库存优化上限）
  ADD COLUMN IF NOT EXISTS settle_mode        text    NOT NULL DEFAULT 'direct'       -- 结算模式：consignment 寄售(PPV) / direct 直购
                                                  CHECK (settle_mode IN ('consignment','direct')),
  ADD COLUMN IF NOT EXISTS hms_billing_code   text    NOT NULL DEFAULT '',            -- HMS 计费对照码（扫码消耗即计费）
  ADD COLUMN IF NOT EXISTS monthly_usage      integer NOT NULL DEFAULT 0 CHECK (monthly_usage >= 0);  -- 月均消耗量（库存优化基线）

COMMENT ON COLUMN clinical.supply_item.spd_enabled      IS '是否纳入 SPD 物流（采购/三级库位/扫码消耗/PPV 结算）';
COMMENT ON COLUMN clinical.supply_item.value_level     IS '价值等级：high 高值(一物一码)/medium 中值/low 低值';
COMMENT ON COLUMN clinical.supply_item.udi_code        IS '医疗器械唯一标识 UDI-DI（高值耗材必填）';
COMMENT ON COLUMN clinical.supply_item.is_traceable    IS '是否一物一码追溯；高值耗材必须为 true';
COMMENT ON COLUMN clinical.supply_item.serial_no       IS '单品唯一序列号，从供应商到患者全程留痕';
COMMENT ON COLUMN clinical.supply_item.level1_qty      IS '一级库（中心库房）在库数量';
COMMENT ON COLUMN clinical.supply_item.level2_qty      IS '二级库（科室库房）在库数量';
COMMENT ON COLUMN clinical.supply_item.point_qty       IS '消耗点（手术室/治疗车）在库数量';
COMMENT ON COLUMN clinical.supply_item.ref_order_point IS '建议补货点（再订货点），库存优化输出';
COMMENT ON COLUMN clinical.supply_item.max_stock       IS '最高库存上限，超过即呆滞积压';
COMMENT ON COLUMN clinical.supply_item.settle_mode     IS '结算模式：consignment 寄售按实际消耗 PPV / direct 直购按采购';
COMMENT ON COLUMN clinical.supply_item.hms_billing_code IS 'HMS 计费对照码，扫码消耗即触发计费';
COMMENT ON COLUMN clinical.supply_item.monthly_usage  IS '近 3 个月月均消耗量，用于安全库存与再订货点测算';

CREATE INDEX IF NOT EXISTS idx_supply_item_spd_level
  ON clinical.supply_item(spd_enabled, value_level);
CREATE INDEX IF NOT EXISTS idx_supply_item_udi
  ON clinical.supply_item(udi_code) WHERE spd_enabled = true;

-- ---------------------------------------------------------------------------
-- 二、高值耗材一物一码追溯流水表（病案设备耗材域）
--   一件高值耗材 = 一行；stage 记录当前所处物流环节，闭环追溯不漏。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.supply_highvalue_trace (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       uuid NOT NULL REFERENCES clinical.supply_item(id),
  serial_no     text NOT NULL,                       -- 一物一码序列号（业务唯一键）
  udi_code      text NOT NULL DEFAULT '',            -- UDI-DI
  item_name     text NOT NULL,                       -- 冗余名称，便于审计只读追溯
  supplier_name text NOT NULL DEFAULT '',
  dept          text NOT NULL DEFAULT '',            -- 当前所在科室（二级库/消耗点归属）
  stage         text NOT NULL DEFAULT 'purchased'    -- 物流闭环：purchased 采购订单
                  CHECK (stage IN ('purchased','arrived','level1','level2','point','used','billed','settled')),
  patient_ref   text NOT NULL DEFAULT '',            -- 已使用患者脱敏标识（P-xxxx，未使用为空）
  hms_billing_code text NOT NULL DEFAULT '',         -- 计费对照码
  unit_price    numeric(12,2) NOT NULL DEFAULT 0.00, -- 单件单价
  operated_by   uuid,
  operated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (serial_no)
);

CREATE INDEX IF NOT EXISTS idx_highvalue_trace_item ON clinical.supply_highvalue_trace(item_id);
CREATE INDEX IF NOT EXISTS idx_highvalue_trace_stage ON clinical.supply_highvalue_trace(stage, operated_at DESC);
CREATE INDEX IF NOT EXISTS idx_highvalue_trace_patient ON clinical.supply_highvalue_trace(patient_ref) WHERE patient_ref <> '';

COMMENT ON TABLE clinical.supply_highvalue_trace IS
  '高值耗材一物一码追溯：采购→到货→一级库→二级库→消耗点→使用→计费→结算 全程留痕';

-- ---------------------------------------------------------------------------
-- 三、权限码（幂等）
--   consumable_spd:view   查看 SPD 物流驾驶舱（admin / 物资科 / 护理部 / 财务）
--   consumable_spd:manage  SPD 采购/补货/扫码消耗写权限（admin / 物资科）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('consumable_spd:view',   'SPD 耗材物流查看', 'consumable-spd',
     '查看 SPD 驾驶舱：采购/三级库位/扫码消耗/PPV 结算与高值一物一码追溯'),
  ('consumable_spd:manage', 'SPD 耗材物流操作', 'consumable-spd',
     'SPD 采购申请、补货调拨、扫码领用与消耗计费（admin/物资科）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'consumable_spd:view'),
  ('admin', 'consumable_spd:manage')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 四、演示种子：把既有 269 物资升级为 SPD 高值/中值/低值样例（幂等）
--   仅打标签、不改变既有 quantity；真实库由 BFF 纯函数用内置台账兜底演示。
-- ---------------------------------------------------------------------------
UPDATE clinical.supply_item
   SET spd_enabled = true, value_level = 'high', is_traceable = true,
       settle_mode = 'consignment', level1_qty = quantity
 WHERE item_code = 'DISP-OR-STENT' AND spd_enabled = false;

UPDATE clinical.supply_item
   SET spd_enabled = true, value_level = 'high', is_traceable = true,
       settle_mode = 'consignment', level1_qty = quantity
 WHERE item_code = 'DISP-OR-JOINT' AND spd_enabled = false;

UPDATE clinical.supply_item
   SET spd_enabled = true, value_level = 'medium', settle_mode = 'direct',
       level1_qty = quantity
 WHERE item_code = 'DISP-SYRINGE' AND spd_enabled = false;

-- 【远期路线图】后续迁移将增加：
--   - spd_purchase_order / spd_goods_receipt（采购订单与到货验收正式表，对接供应商 EDI）；
--   - spd_consumption_charge（扫码消耗与 HMS 计费一对一勾稽表）；
--   - spd_settlement_ppv（按实际消耗与供应商月度结算对账单）。
