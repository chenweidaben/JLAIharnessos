-- ============================================================================
-- 健澜科技 jlmedaios - 医疗设备管理深化（M177-C）【病案设备耗材】
--
-- 【业务目标】设备管理要真实，不能台账和实物对不上。
--   在 268-equipment.sql 的「设备台账 + 预防性维护」基础上，把设备管理从
--   「一张台账表 + 一条维护计划」深化为四个可对账的维度：
--
--   1. 设备台账：采购 → 验收 → 入账 → 使用 → 报废 五段全留痕，资产编号与实物对码；
--   2. 维保管理：保养计划（周期/上次保养）+ 维修记录（故障描述/费用/停机天数）+
--      故障跟踪（未结故障单列，带病运行设备不藏着）；
--   3. 计量管理：强制检定设备标记、检定周期、检定证书编号与有效期，到期前预警；
--   4. 折旧管理：折旧方法、折旧年限、残值率，由入账日起计提，产出净值。
--
-- 设计要点：
--   - ALTER TABLE ... ADD COLUMN IF NOT EXISTS 幂等扩展 clinical.medical_equipment，
--     不改动 268 既有列；存量设备新列可空，老数据不迁移也能跑。
--   - 三类子表（生命周期事件 / 维修记录 / 检定记录）全部挂在 equipment_id 外键上，
--     与台账一一对应，杜绝「台账有、实物无」或「实物在、台账无」的对不上。
--   - 不触碰 WebSocket；不写业务逻辑，逻辑收敛在 BFF 纯函数聚合器。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ----------------------------------------------------------------------------
-- 维度①设备台账：五段生命周期字段扩展（采购/验收/入账/使用/报废）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.medical_equipment
  ADD COLUMN IF NOT EXISTS asset_no              text,
  ADD COLUMN IF NOT EXISTS manufacturer          text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS acceptance_date       date,
  ADD COLUMN IF NOT EXISTS capitalization_date    date,
  ADD COLUMN IF NOT EXISTS put_into_use_date      date,
  ADD COLUMN IF NOT EXISTS scrap_date            date,
  ADD COLUMN IF NOT EXISTS lifecycle_stage       text NOT NULL DEFAULT 'purchase'
                  CHECK (lifecycle_stage IN ('purchase','acceptance','capitalization','in_use','scrapped')),
  -- 维度③计量：强检标记 + 检定周期(月) + 上次检定日 + 检定证书编号
  ADD COLUMN IF NOT EXISTS is_mandatory_inspection boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inspection_cycle_months  integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS last_inspection_date    date,
  ADD COLUMN IF NOT EXISTS inspection_certificate_no text,
  -- 维度④折旧：残值率(0~1) + 折旧方法 + 折旧年限(年)
  ADD COLUMN IF NOT EXISTS residual_rate         numeric(5,4) NOT NULL DEFAULT 0.05
                  CHECK (residual_rate >= 0 AND residual_rate <= 1),
  ADD COLUMN IF NOT EXISTS depreciation_method   text NOT NULL DEFAULT 'straight_line'
                  CHECK (depreciation_method IN ('straight_line','double_declining','sum_of_years')),
  ADD COLUMN IF NOT EXISTS useful_life_years     integer NOT NULL DEFAULT 8
                  CHECK (useful_life_years > 0);

COMMENT ON COLUMN clinical.medical_equipment.asset_no IS
  '资产编号：与实物标签/固定资产卡一一对应，台账与实物对码的主键';
COMMENT ON COLUMN clinical.medical_equipment.lifecycle_stage IS
  '台账五段：purchase采购/acceptance验收/capitalization入账/in_use使用/scrapped报废';
COMMENT ON COLUMN clinical.medical_equipment.is_mandatory_inspection IS
  '是否强制检定计量设备（如超声/生化分析仪），漏检即停用';
COMMENT ON COLUMN clinical.medical_equipment.depreciation_method IS
  '折旧方法：straight_line年限平均/double_declining双倍余额递减/sum_of_years年数总和';

-- 资产编号唯一对码：同一资产编号不能登记两台设备（台账实物对不上的根因之一）
CREATE UNIQUE INDEX IF NOT EXISTS idx_medical_equipment_asset_no
  ON clinical.medical_equipment (asset_no)
  WHERE asset_no IS NOT NULL;

-- 强检设备到期查询：只扫「未报废且需强检」的设备，按上次检定日 + 周期排序预警
CREATE INDEX IF NOT EXISTS idx_medical_equipment_inspection
  ON clinical.medical_equipment (last_inspection_date)
  WHERE is_mandatory_inspection = true AND status <> 'scrapped';

-- ----------------------------------------------------------------------------
-- 维度①设备台账：生命周期事件流水（采购/验收/入账/使用/报废 每次动作留痕）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.equipment_lifecycle_event (
  id           uuid PRIMARY KEY,
  equipment_id uuid NOT NULL REFERENCES clinical.medical_equipment(id) ON DELETE CASCADE,
  stage        text NOT NULL CHECK (stage IN ('purchase','acceptance','capitalization','in_use','scrapped')),
  event_date   date NOT NULL,
  note         text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.equipment_lifecycle_event IS
  '设备生命周期事件：五段全留痕，事件日期回写台账对应日期列，保证台账与实物时序一致';

CREATE INDEX IF NOT EXISTS idx_equipment_lifecycle_equip
  ON clinical.equipment_lifecycle_event (equipment_id, event_date DESC);

-- ----------------------------------------------------------------------------
-- 维度②维保管理：维修记录（故障跟踪 + 费用 + 停机天数）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.equipment_repair (
  id            uuid PRIMARY KEY,
  equipment_id  uuid NOT NULL REFERENCES clinical.medical_equipment(id) ON DELETE CASCADE,
  fault_date    date NOT NULL,
  fault_desc    text NOT NULL DEFAULT '',
  cost          numeric(14,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  downtime_days integer NOT NULL DEFAULT 0 CHECK (downtime_days >= 0),
  resolved      boolean NOT NULL DEFAULT false,
  resolved_date date,
  vendor        text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.equipment_repair IS
  '设备维修记录：resolved=false 即带病运行的未结故障，BFF 单列跟踪，不允许悄悄报废';

-- 未结故障查询：设备科优先处理长期带病设备
CREATE INDEX IF NOT EXISTS idx_equipment_repair_open
  ON clinical.equipment_repair (equipment_id, fault_date DESC)
  WHERE resolved = false;

-- ----------------------------------------------------------------------------
-- 维度③计量管理：检定记录流水（证书编号 + 有效期）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.equipment_inspection (
  id             uuid PRIMARY KEY,
  equipment_id   uuid NOT NULL REFERENCES clinical.medical_equipment(id) ON DELETE CASCADE,
  inspection_date date NOT NULL,
  certificate_no text NOT NULL DEFAULT '',
  valid_until    date NOT NULL,
  result         text NOT NULL DEFAULT 'pass' CHECK (result IN ('pass','fail')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.equipment_inspection IS
  '计量检定记录：valid_until 到期前预警；result=fail 的强检设备必须停用';

CREATE INDEX IF NOT EXISTS idx_equipment_inspection_equip
  ON clinical.equipment_inspection (equipment_id, valid_until DESC);
