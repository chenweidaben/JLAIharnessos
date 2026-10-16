-- ============================================================================
-- 健澜科技 jlmedaios - 医院财务管理深化 · 收支流水维度扩展（M178-A · 财务人力行政党建）
-- 360-finance-deep.sql
--
-- 【财务人力行政党建】财务管理要真实，不能账实不符。
--   在 270-finance.sql 的 clinical.finance_transaction 流水基础上，补齐管理会计
--   所需的核算维度，让「预算管理 / 成本核算 / 收入管理 / 财务分析」四件事都能
--   从同一张真实流水表上算出来，而不是另起一张拍脑袋的报表表：
--
--   预算管理：period_year + period_month 锁定会计期间，配合 finance_budget 年度
--             预算，做月度执行率与超支预警（账实相符：实际=流水，预算=预算表）。
--   成本核算：cost_center 成本中心（科室成本）、project_code 项目成本、
--             disease_code 病种成本、cost_nature 直接/间接成本（间接成本按动因分摊）。
--   收入管理：bill_source 标记单据来源（门诊/住院/药品/检查），与 type=income
--             的 category 互相印证，防止收入串科目。
--   财务分析：固定/变动成本划分由 BFF 按 category 口径计算（salary/equipment/
--             utilities 为固定；drug_purchase/consumable_purchase 为变动），此处
--             只存事实流水，不存推导结果，保证本量利分析可复算、可审计。
--
-- 设计要点：
--   - 全部 ALTER ... ADD COLUMN IF NOT EXISTS，对已有 270-finance.sql 库幂等，
--     老库升级不报错、不丢数据；新增列允许 NULL，历史流水按“未细分维度”处理。
--   - cost_nature 用 CHECK 锁死 direct/indirect，间接成本才允许被分摊，避免
--     直接成本被重复分摊导致科室成本虚高（账实不符的高发点）。
--   - finance_budget 年度预算与流水分开存：预算是“计划数”，流水是“实际数”，
--     两张表 UNIQUE(cost_center, fiscal_year, budget_subject) 对账，超支预警
--     = 实际累计 / 预算进度基准，口径全院一致。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS /
--       CREATE INDEX IF NOT EXISTS，可重复执行。
-- 不触碰 WebSocket，不新增依赖。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ----------------------------------------------------------------------------
-- 1) 扩展 clinical.finance_transaction：管理会计核算维度
--    （老库升级：列不存在才加；历史流水新列可为 NULL，按未细分维度聚合）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.finance_transaction
  ADD COLUMN IF NOT EXISTS period_year     smallint,                 -- 会计年度（预算管理）
  ADD COLUMN IF NOT EXISTS period_month    smallint,                 -- 会计月份 1..12（月度执行）
  ADD COLUMN IF NOT EXISTS cost_center      text,                     -- 成本中心/核算单元（科室成本）
  ADD COLUMN IF NOT EXISTS project_code    text,                     -- 项目成本（如 P-腹腔镜胆囊切除）
  ADD COLUMN IF NOT EXISTS disease_code    text,                     -- 病种成本（ICD/DRG 病种编码）
  ADD COLUMN IF NOT EXISTS budget_subject  text,                     -- 预算科目（年度预算对账）
  ADD COLUMN IF NOT EXISTS bill_source      text,                    -- 单据来源：outpatient/inpatient/drug/exam
  ADD COLUMN IF NOT EXISTS cost_nature      text
              CHECK (cost_nature IN ('direct','indirect'));          -- 直接/间接成本（仅间接可分摊）

-- 月度执行率查询：按 会计期间 + 成本中心 聚合实际收支
CREATE INDEX IF NOT EXISTS idx_finance_dept_period
  ON clinical.finance_transaction (cost_center, period_year, period_month);

-- 项目成本 / 病种成本归集
CREATE INDEX IF NOT EXISTS idx_finance_project
  ON clinical.finance_transaction (project_code, recorded_at);
CREATE INDEX IF NOT EXISTS idx_finance_disease
  ON clinical.finance_transaction (disease_code, recorded_at);

-- ----------------------------------------------------------------------------
-- 2) clinical.finance_budget：年度预算表（计划数，与流水实际数对账）
--    一个成本中心 × 一个年度 × 一个预算科目 = 一条年度预算额度
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.finance_budget (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_center     text NOT NULL,                       -- 成本中心/科室编码
  cost_center_name text NOT NULL DEFAULT '',           -- 成本中心中文名（院长看得懂）
  fiscal_year     smallint NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
  budget_subject  text NOT NULL,                       -- 预算科目（对应流水 category 口径）
  annual_amount   numeric(14,2) NOT NULL CHECK (annual_amount >= 0),  -- 年度预算额度（元）
  remark          text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cost_center, fiscal_year, budget_subject)     -- 同一核算单元同年同科目仅一条预算
);

-- 按年度 + 成本中心 拉预算（超支预警的计划数侧）
CREATE INDEX IF NOT EXISTS idx_finance_budget_year_dept
  ON clinical.finance_budget (fiscal_year, cost_center);
