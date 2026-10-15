-- ============================================================================
-- 健澜科技 jlmedaios - 医疗设备台账与预防性维护（M139-B）【医院运营管理】
--
-- 【业务目标】设备维护提前提醒，不能坏了才知道。
--   传统设备管理是「坏了再修」的被动模式，本模块转向「预防性维护」：
--   每台设备登记时记录购置日期与原值，维护计划落地后写入 next_maintenance_date，
--   BFF 聚合器据此提前 N 天（默认 7 天）在状态报告中抛出预警 / 逾期清单，
--   让设备科在故障发生前完成保养，降低非计划停机对临床的冲击。
--
-- 设备状态（与 equipmentAggregator.ts 的 EquipmentStatus 枚举一致）：
--   in_use    在用
--   repairing 维修中
--   idle      停用
--   scrapped  报废
--
-- 维护计划（maintenance 子记录）：每次排程一条，next_date 为下次保养日；
--   设备台账上冗余 next_maintenance_date，便于提前提醒快查。
--
-- 幂等：重复执行不会报错、不会清空已有数据。
-- 不触碰 WebSocket：本版仅做拉取式 REST，实时推送留待后续。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ----------------------------------------------------------------------------
-- 医疗设备台账主表
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.medical_equipment (
  id                    uuid PRIMARY KEY,
  name                  text NOT NULL,
  model                 text NOT NULL DEFAULT '',
  dept                  text NOT NULL DEFAULT '',
  purchase_date         date NOT NULL,
  -- 购置原值（元），用于资产统计
  value                 numeric(14,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  status                text NOT NULL DEFAULT 'in_use'
                        CHECK (status IN ('in_use','repairing','idle','scrapped')),
  -- 下次预防性维护日期：由排程写入，提前提醒据此计算；NULL = 尚未排程
  next_maintenance_date date NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.medical_equipment IS
  '医疗设备台账（医院运营管理）：登记在用/维修中/停用/报废四类状态，支持预防性维护提前提醒';
COMMENT ON COLUMN clinical.medical_equipment.next_maintenance_date IS
  '下次预防性维护日期；BFF 据此提前 7 天预警，避免设备坏了才发现';

-- 按部门 + 状态盘点：设备科日常台账高频查询
CREATE INDEX IF NOT EXISTS idx_medical_equipment_dept_status
  ON clinical.medical_equipment (dept, status);

-- 提前提醒核心索引：只扫「在用且已排程」的设备，按下次维护日升序，
-- 报告查询即取未来窗口内到期与已逾期的记录
CREATE INDEX IF NOT EXISTS idx_medical_equipment_next_maint
  ON clinical.medical_equipment (next_maintenance_date)
  WHERE status = 'in_use' AND next_maintenance_date IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 维护计划流水（每次排程一条，留痕可追溯）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.equipment_maintenance (
  id            uuid PRIMARY KEY,
  equipment_id  uuid NOT NULL REFERENCES clinical.medical_equipment(id) ON DELETE CASCADE,
  next_date     date NOT NULL,
  note          text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.equipment_maintenance IS
  '设备预防性维护排程流水：每次排程留痕，next_date 回写台账 next_maintenance_date';

-- 某台设备的维护历史：按时间倒序
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_equip
  ON clinical.equipment_maintenance (equipment_id, next_date DESC);
