-- ============================================================================
-- 健澜科技 jlmedaios - 医院财务管理 · 收支流水表（M139-D · 医院运营管理）
-- 270-finance.sql
--
-- 【医院运营管理】财务报表清晰，院长一眼看懂钱花在哪了。
--   本表记录医院每一笔收入与支出的流水，是管理驾驶舱「财务报表」的数据源：
--
--   收入类别（type = income）：
--     outpatient        门诊收入
--     inpatient         住院收入
--     drug              药品收入
--     exam              检查收入
--
--   支出类别（type = expense）：
--     salary             人员工资
--     drug_purchase      药品采购
--     equipment_purchase 设备采购
--     consumable_purchase 耗材采购
--     utilities          水电费
--
-- 设计要点：
--   - amount 一律为正数（CHECK amount > 0），收/支方向由 type 区分，避免出现
--     「负收入」「负支出」这类口径歧义；报表净额 = 收入合计 - 支出合计。
--   - category 用 CHECK 约束锁死九类口径，任何越界类别在入库即失败，保证院长
--     看到的分类汇总口径全院一致、可审计。
--   - dept 记录费用归属科室，支撑「科室分摊」——每个科室赚了多少、花了多少、
--     净贡献多少，一目了然。
--   - recorded_at 用数据库时钟 now()，不采信前端自报时间，防止账期被篡改。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重复执行。
-- 不触碰 WebSocket，不新增依赖。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

CREATE TABLE IF NOT EXISTS clinical.finance_transaction (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         text NOT NULL CHECK (type IN ('income','expense')),
  category     text NOT NULL CHECK (category IN
                 ('outpatient','inpatient','drug','exam',
                  'salary','drug_purchase','equipment_purchase','consumable_purchase','utilities')),
  amount       numeric(14,2) NOT NULL CHECK (amount > 0),   -- 正数；收支方向由 type 区分
  dept         text NOT NULL,                               -- 费用归属科室（科室分摊）
  description  text NOT NULL DEFAULT '',                    -- 摘要：院长看得懂的一句话
  recorded_at  timestamptz NOT NULL DEFAULT now(),           -- 入账时间（DB 时钟，防篡改）
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 按账期 + 收支方向拉报表（院长按时间看收支）
CREATE INDEX IF NOT EXISTS idx_finance_txn_range
  ON clinical.finance_transaction (recorded_at, type);

-- 按科室分摊汇总（每个科室赚/花/净贡献）
CREATE INDEX IF NOT EXISTS idx_finance_txn_dept
  ON clinical.finance_transaction (dept, recorded_at);
