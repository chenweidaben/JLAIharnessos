-- ============================================================================
-- 健澜科技 jlmedaios - M165-B 医院预算与成本管理深化
--
-- 【CDSS与运营精细化】
--   预算管理要真实，不能拍脑袋。本表把科室年度预算从「领导拍个数」升级为
--   「按驱动因子测算 + 执行逐月跟踪 + 超支预测 + 结构优化建议」的闭环：
--
--     1. budget_plan：科室年度预算主表，按四大类（人力/药品/设备/运营）
--        及其明细子项（工资/绩效/社保/培训；西药/中成药/耗材；
--        采购/折旧/维护；水电/办公/差旅/会议）落库；
--     2. budget_execution：预算执行流水，按月记录各子项实际支出，
--        由 BFF 纯函数聚合器（budgetDeepAggregator）计算执行率与偏差；
--     3. budget_overrun_forecast：超支预测留痕（年化运行率外推），
--        供财务处与科室主任看板复盘；
--     4. budget_reallocation：预算结构优化建议（从结余项向临床刚需项调剂），
--        仅建议不自动调账，需财务处审批。
--
-- 预算口径（元，人民币）：
--   - 人力：编制人数 × 人均月薪 × 12 × (1 + 绩效系数 + 社保公积金系数) + 人均培训；
--   - 药品：年门诊人次 × 次均药费 + 年占用床日 × 床日均药耗；
--   - 设备：本年采购计划 + 在用设备账面原值 / 折旧年限 + 维护费率；
--   - 运营：科室面积 × 水电单价 + 编制人数 × 人均办公 + 差旅/会议定额。
--
-- 生产红线：
--   - 仅财务处 / admin 可读写；金额字段 numeric 不取整，避免四舍五入失真；
--   - 执行流水只增不改（append-only），调整走 budget_reallocation 审批留痕；
--   - CREATE TABLE IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- medmuse.budget_plan：科室年度预算主表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.budget_plan (
  id              bigserial PRIMARY KEY,
  dept_code       text        NOT NULL,                 -- 科室编码（关联 clinical.departments）
  dept_name       text        NOT NULL DEFAULT '',      -- 科室名称（冗余，便于报表）
  fiscal_year     int         NOT NULL,                 -- 预算年度，如 2026
  category        text        NOT NULL,                 -- 大类：labor / drug / equipment / operation
  sub_item        text        NOT NULL,                 -- 子项：salary/performance/social_security/training
                                                        --       west_medicine/patent_drug/consumable
                                                        --       purchase/depreciation/maintenance
                                                        --       utility/office/travel/meeting
  annual_budget   numeric(14,2) NOT NULL DEFAULT 0,    -- 年度预算金额（元）
  -- 驱动因子（可追溯，不拍脑袋）：记录本预算是按什么量价口径算出来的
  driver_qty      numeric(14,2) NOT NULL DEFAULT 0,    -- 驱动量（人数/人次/床日/面积/设备原值）
  driver_unit     text        NOT NULL DEFAULT '',      -- 驱动量单位（人/人次/床日/m²/元）
  driver_price    numeric(14,4) NOT NULL DEFAULT 0,     -- 单价 / 系数（元/人·月、元/人次…）
  method_note     text        NOT NULL DEFAULT '',      -- 测算口径说明
  status          text        NOT NULL DEFAULT 'draft', -- draft / approved / archived
  approved_by     text        NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budget_plan_category_chk
    CHECK (category IN ('labor','drug','equipment','operation')),
  CONSTRAINT budget_plan_status_chk
    CHECK (status IN ('draft','approved','archived')),
  CONSTRAINT budget_plan_dept_year_sub_uk
    UNIQUE (dept_code, fiscal_year, category, sub_item)
);

COMMENT ON TABLE medmuse.budget_plan IS '科室年度预算（M165-B，CDSS与运营精细化）';

-- ---------------------------------------------------------------------------
-- medmuse.budget_execution：预算执行流水（append-only，按月记录实际支出）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.budget_execution (
  id              bigserial PRIMARY KEY,
  dept_code       text        NOT NULL,
  fiscal_year     int         NOT NULL,
  period_month    int         NOT NULL,                 -- 自然月 1..12
  category        text        NOT NULL,
  sub_item        text        NOT NULL,
  actual_spent    numeric(14,2) NOT NULL DEFAULT 0,    -- 本月实际支出（元）
  source_note     text        NOT NULL DEFAULT '',      -- 数据来源（HIS收费/HRP/资产系统）
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budget_execution_month_chk
    CHECK (period_month BETWEEN 1 AND 12),
  CONSTRAINT budget_execution_category_chk
    CHECK (category IN ('labor','drug','equipment','operation')),
  CONSTRAINT budget_execution_uk
    UNIQUE (dept_code, fiscal_year, period_month, category, sub_item)
);

COMMENT ON TABLE medmuse.budget_execution IS '预算执行月度流水（M165-B）';

-- ---------------------------------------------------------------------------
-- medmuse.budget_overrun_forecast：超支预测留痕（年化运行率外推）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.budget_overrun_forecast (
  id              bigserial PRIMARY KEY,
  dept_code       text        NOT NULL,
  fiscal_year     int         NOT NULL,
  as_of_month     int         NOT NULL,                 -- 预测截止月 1..12
  category        text        NOT NULL,
  annual_budget   numeric(14,2) NOT NULL,               -- 年度预算
  ytd_spent       numeric(14,2) NOT NULL,               -- 截至本月累计支出
  projected_year_end numeric(14,2) NOT NULL,            -- 年化外推年末支出
  predicted_overrun  numeric(14,2) NOT NULL DEFAULT 0, -- 预计超支额（负=结余）
  risk_level      text        NOT NULL DEFAULT 'green',-- green / yellow / red
  method_note     text        NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budget_overrun_level_chk
    CHECK (risk_level IN ('green','yellow','red')),
  CONSTRAINT budget_overrun_category_chk
    CHECK (category IN ('labor','drug','equipment','operation'))
);

COMMENT ON TABLE medmuse.budget_overrun_forecast IS '预算超支预测留痕（M165-B）';

-- ---------------------------------------------------------------------------
-- medmuse.budget_reallocation：预算结构优化建议（仅建议，不自动调账）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.budget_reallocation (
  id              bigserial PRIMARY KEY,
  dept_code       text        NOT NULL,
  fiscal_year     int         NOT NULL,
  source_category text        NOT NULL,                 -- 调出大类（长期结余）
  target_category text        NOT NULL,                 -- 调入大类（临床刚需/超支）
  amount          numeric(14,2) NOT NULL,               -- 建议调剂金额（元）
  rationale       text        NOT NULL DEFAULT '',      -- 依据（历史执行率/趋势）
  status          text        NOT NULL DEFAULT 'proposed', -- proposed / approved / rejected
  decided_by      text        NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  decided_at      timestamptz,
  CONSTRAINT budget_realloc_status_chk
    CHECK (status IN ('proposed','approved','rejected'))
);

COMMENT ON TABLE medmuse.budget_reallocation IS '预算结构优化建议留痕（M165-B，仅建议不自动调账）';

-- ---------------------------------------------------------------------------
-- 索引
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS budget_plan_dept_year_idx
  ON medmuse.budget_plan (dept_code, fiscal_year);
CREATE INDEX IF NOT EXISTS budget_execution_dept_year_idx
  ON medmuse.budget_execution (dept_code, fiscal_year);
CREATE INDEX IF NOT EXISTS budget_overrun_dept_year_idx
  ON medmuse.budget_overrun_forecast (dept_code, fiscal_year);
