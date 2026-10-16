-- ============================================================================
-- 健澜科技 jlmedaios - M172-C 医院运营与管理深化
--
-- 【安全质量与运营】
--   运营分析要有数据，不能拍脑袋。本表把科室运营从「年终拍脑袋估个数」升级为
--   「按门诊/住院/手术/财务四域逐月落指标 + 对标标杆 + 瓶颈自动识别」的闭环：
--
--     1. ops_metric：科室运营指标主表，按 门诊/住院/手术/财务 四大域、
--        按周期（月/季/年）落每一项原始指标，每一行都带量、单位、标杆值、
--        目标值与数据来源，可追溯、可复算；
--     2. 派生效率指标（三四级手术占比、利润率、床日效率、成本率等）不在库里
--        落库，由 BFF 纯函数聚合器（opsDeepAggregator）实时计算，避免口径漂移；
--     3. 瓶颈识别与对标结果不写库，仅在看板呈现并下发改进任务（只建议，不自动
--        改医嘱/结算）。
--
-- 四域指标口径（2000 床、日门诊 1 万规模三甲参考）：
--   - 门诊 outpatient：门诊量(人次)/次均费用(元)/平均等待(分钟)/预约率/爽约率；
--   - 住院 inpatient：在院人数/入院人数/出院人数/平均住院日(天)/床位使用率；
--   - 手术 surgery：手术量(台)/三四级手术量(台)/手术等待(小时)/PACU周转率；
--   - 财务 finance：收入(元)/成本(元)/利润(元)/DRG结余(元)/医保拒付率。
--
-- 生产红线：
--   - 仅运营管理处 / admin 可读写；比率类指标存 0..1 小数，金额 numeric 不取整；
--   - 指标流水只增不改（append-only），修正走新一期记录，保留历史可追溯；
--   - CREATE TABLE IF NOT EXISTS，可重复执行；本表仅运营管理辅助，不触发诊疗。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- medmuse.ops_metric：科室运营指标主表（四域 × 周期 × 指标项）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.ops_metric (
  id              bigserial PRIMARY KEY,
  dept_code       text        NOT NULL,                 -- 科室编码（关联 clinical.departments）
  dept_name       text        NOT NULL DEFAULT '',      -- 科室名称（冗余，便于报表）
  period_type     text        NOT NULL DEFAULT 'month', -- month / quarter / year
  period_key      text        NOT NULL,                 -- 周期，如 2026-09 / 2026-Q3 / 2026
  domain          text        NOT NULL,                 -- outpatient / inpatient / surgery / finance
  metric_key      text        NOT NULL,                 -- 指标键，见下方口径
  metric_name     text        NOT NULL,                 -- 指标中文名
  metric_value    numeric(16,2) NOT NULL DEFAULT 0,     -- 指标值（比率类为 0..1 小数）
  unit            text        NOT NULL DEFAULT '',      -- 单位：人次/人/元/分钟/天/台/小时/%
  benchmark_value numeric(16,2) NOT NULL DEFAULT 0,     -- 标杆值（全院均值/区域标杆，供对标）
  target_value    numeric(16,2) NOT NULL DEFAULT 0,     -- 目标值（院内考核线）
  data_source     text        NOT NULL DEFAULT '',       -- 数据来源：HIS/EMR/手麻/HRP/医保
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_metric_domain_chk
    CHECK (domain IN ('outpatient','inpatient','surgery','finance')),
  CONSTRAINT ops_metric_period_chk
    CHECK (period_type IN ('month','quarter','year')),
  -- 同一科室同一周期同一指标唯一，重复上报覆盖更新 updated_at（逻辑去重）
  CONSTRAINT ops_metric_unique
    UNIQUE (dept_code, period_type, period_key, domain, metric_key)
);

-- 常用查询索引：按科室 + 周期 + 域拉指标
CREATE INDEX IF NOT EXISTS ops_metric_dept_period_idx
  ON medmuse.ops_metric (dept_code, period_key, domain);
CREATE INDEX IF NOT EXISTS ops_metric_domain_idx
  ON medmuse.ops_metric (domain, period_key);

COMMENT ON TABLE medmuse.ops_metric IS 'M172-C【安全质量与运营】科室运营指标主表：门诊/住院/手术/财务四域逐月落数，供效率分析/对标/瓶颈识别';

-- ---------------------------------------------------------------------------
-- 口径说明（不落库，仅注释留痕；metric_key 取值如下）
-- ---------------------------------------------------------------------------
-- 门诊 outpatient
--   outpatient_visits        门诊量（人次/周期）
--   avg_cost_per_visit       次均费用（元/人次）
--   avg_wait_minutes         平均等待时间（分钟）
--   appointment_rate         预约率（0..1）
--   no_show_rate              爽约率（0..1）
-- 住院 inpatient
--   in_hospital              平均在院人数（人）
--   admissions                入院人数（人/周期）
--   discharges                出院人数（人/周期）
--   avg_los                   平均住院日（天）
--   bed_occupancy             床位使用率（0..1）
--   total_beds                编制床位（张）
-- 手术 surgery
--   surgery_count             手术量（台/周期）
--   high_level_surgery        三四级手术量（台/周期）
--   surgery_wait_hours        手术等待时间（小时）
--   pacu_turnover             麻醉恢复室周转率（台/床日）
-- 财务 finance
--   revenue                   收入（元/周期）
--   cost                      成本（元/周期）
--   profit                    利润（元/周期）
--   drg_surplus               DRG 结余（元/周期，负为超支）
--   insurance_denial_rate     医保拒付率（0..1）
