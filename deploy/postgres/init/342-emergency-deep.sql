-- ============================================================================
-- 健澜科技 jlmedaios · M172-A 医院安全与应急管理深化——预案库扩展 / 物资 / 响应自动化
--
-- 【安全质量与运营】应急预案要真能用，不能纸上谈兵：
--   本脚本在 M162-A（324-emergency.sql）五场景预案基础上，把预案库扩到全院十类突发情景，
--   并补齐三件"真能用"的抓手：
--     1) emergency_plan 扩展列：风险等级 / 触发条件 / 自动通知链 / 物资清单引用 / 演练频次；
--     2) emergency_supply（应急物资台账）：储备清单 + 效期预警 + 调用记录；
--     3) emergency_response_rule（响应自动化规则）：触发条件 → 自动通知 → 自动启动预案。
--
-- 十类情景：火灾 fire / 地震 earthquake / 停电 power_outage / 停水 water_outage /
--   信息系统故障 it_failure / 传染病暴发 outbreak / 批量伤员 mass_casualty /
--   危化品泄漏 hazmat_spill / 恐怖袭击 terror_attack / 患者猝死 cardiac_arrest。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ALTER TABLE ... ADD COLUMN IF NOT EXISTS，可重复执行。
-- 权限：admin（院领导 / 医务处 / 保卫处 / 后勤保障处）可读写；其余角色仅本部门参演记录可见。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) emergency_plan 扩展列（十类情景全预案库）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.emergency_plan
  ADD COLUMN IF NOT EXISTS risk_level        text NOT NULL DEFAULT 'medium',
  -- 触发条件（布尔表达式语义，如 'fire_alarm==true && zone=="病房楼"'），供响应自动化匹配
  ADD COLUMN IF NOT EXISTS trigger_expr      text,
  -- 自动通知链（ roles / channels / deadline_minutes ）
  ADD COLUMN IF NOT EXISTS auto_notify       jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 关联应急物资清单（ emergency_supply.item_code 数组）
  ADD COLUMN IF NOT EXISTS supply_refs       jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 预案版本与签发状态：draft 草拟 / reviewed 会审通过 / issued 院务会签发
  ADD COLUMN IF NOT EXISTS plan_status       text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS drill_interval_days int NOT NULL DEFAULT 180;

COMMENT ON COLUMN clinical.emergency_plan.risk_level   IS 'M172-A 情景固有风险等级 high/medium/low';
COMMENT ON COLUMN clinical.emergency_plan.trigger_expr  IS 'M172-A 响应自动化触发条件表达式';
COMMENT ON COLUMN clinical.emergency_plan.plan_status  IS 'M172-A 预案须院务会签发后方可启动，不能纸面启动';

-- ----------------------------------------------------------------------------
-- 2) emergency_supply：应急物资台账（储备清单 + 效期预警 + 调用记录）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.emergency_supply (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 物资编码（如 FIRE-001 / PPE-002）
  item_code         text NOT NULL,
  -- 物资名称（担架 / 灭火器 / 应急照明 / 防护用品 / 应急药品 …）
  item_name         text NOT NULL,
  -- 存放位置（楼栋 / 楼层 / 应急库房编号）
  location          text NOT NULL,
  -- 关联情景（该物资服务于哪类应急预案）
  scenario          text NOT NULL,
  -- 应储备定额 / 当前在库数量
  required_qty       int  NOT NULL DEFAULT 0,
  current_qty       int  NOT NULL DEFAULT 0,
  -- 单位（具 / 个 / 箱 / 套）
  unit              text NOT NULL DEFAULT '件',
  -- 效期（药品 / 防护用品类必填，null 表示无保质期物资）
  expiry_date       timestamptz,
  -- 状态：ok 正常 / low_stock 库存低于定额 / expired 已过效期 / expiring_soon 30 天内到期
  status            text NOT NULL DEFAULT 'ok',
  -- 最近一次调用记录（时间 / 事由 / 领用人 / 数量）
  last_usage        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_code)
);

-- 按状态筛待办（效期预警 / 库存缺口看板）
CREATE INDEX IF NOT EXISTS idx_emergency_supply_status
  ON clinical.emergency_supply(status, expiry_date);
-- 按情景查物资（启动预案时一键调取物资清单）
CREATE INDEX IF NOT EXISTS idx_emergency_supply_scenario
  ON clinical.emergency_supply(scenario);

COMMENT ON TABLE clinical.emergency_supply IS
  'M172-A 应急物资：储备定额 + 效期预警 + 调用记录，演练/实战可调可用';

-- ----------------------------------------------------------------------------
-- 3) emergency_response_rule：响应自动化（触发条件 → 自动通知 → 自动启动预案）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.emergency_response_rule (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 规则编码 RULE-FIRE-001 …
  rule_code         text NOT NULL,
  -- 规则名称（火灾自动报警联动 / 信息系统宕机自动启动 …）
  rule_name         text NOT NULL,
  -- 关联预案情景
  scenario          text NOT NULL,
  -- 触发条件表达式（与 emergency_plan.trigger_expr 对齐）
  trigger_expr      text NOT NULL,
  -- 自动通知动作（通知谁 / 什么渠道 / 几分钟内送达）
  notify_targets    jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 满足触发后自动执行：启动哪一级预案 / 是否广播疏散
  auto_actions      jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 规则开关
  enabled           boolean NOT NULL DEFAULT true,
  -- 命中次数 / 最近命中时间（运营观测）
  hit_count         int NOT NULL DEFAULT 0,
  last_hit_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_code)
);

CREATE INDEX IF NOT EXISTS idx_emergency_rule_enabled
  ON clinical.emergency_response_rule(enabled, scenario);

COMMENT ON TABLE clinical.emergency_response_rule IS
  'M172-A 响应自动化：触发条件→自动通知→自动启动预案，秒级响应不等人';
