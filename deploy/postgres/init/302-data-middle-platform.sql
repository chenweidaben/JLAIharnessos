-- ============================================================================
-- 健澜科技 jlmedaios - 医院数据中台 · 数据集市注册表（M150-C）
--
-- 产品理念：数据中台不是再堆一张静态报表，而是「可刷新的指标资产」。
--   业务库（dwd 明细层）每天都在长，运营/医务/药剂/质控不需要直接打业务库，
--   而是订阅到面向主题的数据集市（Data Mart）：
--     1. 门诊运营集市（日 / 周 / 月 三个粒度）——门急诊量、人次、均次费用趋势；
--     2. 住院运营集市——在院/出区、床位使用率、平均住院日；
--     3. 药品消耗集市——药占比、重点药品消耗、库存周转；
--     4. 质控指标集市——病历甲级率、超时率、核心制度落实率。
--
-- 本文件只建「集市元数据注册表」dws.data_mart：
--   每一行 = 一个对外可订阅的集市，记录它从哪张源表加工、按什么频率刷新、
--   当前行数、最近一次刷新时间。真实明细数据由 BFF 聚合器
--   （aggregators/dataMartAggregator.ts）按刷新口径现场汇总，不落静态快照——
--   刷新后 last_refreshed 更新、row_count 随之变化，保证页面看到的永远是新数。
--
-- 表结构（与 dataMartAggregator 的 DataMart 字段一一对应）：
--   id            uuid 主键
--   mart_name     text 业务唯一键，如 opd_ops_daily / opd_ops_weekly /
--                 opd_ops_monthly / inpatient_ops / drug_consumption / qc_indicators
--   display_name  text 中文名（列表展示）
--   category      text 主题分类 CHECK：outpatient / inpatient / drug / qc
--   source_table  text 上游加工来源表（dwd/dws/ads 层全限定名）
--   refresh_freq  text 刷新频率 CHECK：daily / weekly / monthly
--   row_count     bigint 当前集市物化行数（每次刷新重算）
--   last_refreshed timestamptz 最近一次成功刷新时间，NULL = 尚未刷新
--   status        text 集市状态 CHECK：building / ready / stale / error
--   description   text 集市口径说明
--   created_at / updated_at timestamptz
--
-- 幂等：CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS，重复执行不报错。
-- 不触碰 WebSocket；不新增业务依赖。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS dws;

-- 数据集市元数据注册表（持续优化：后续可扩展 owner / 订阅人 / SLA 字段）
CREATE TABLE IF NOT EXISTS dws.data_mart (
  id             uuid PRIMARY KEY,
  mart_name      text NOT NULL UNIQUE,
  display_name   text NOT NULL,
  category       text NOT NULL CHECK (category IN ('outpatient','inpatient','drug','qc')),
  source_table   text NOT NULL,
  refresh_freq   text NOT NULL CHECK (refresh_freq IN ('daily','weekly','monthly')),
  row_count      bigint NOT NULL DEFAULT 0,
  last_refreshed timestamptz NULL,
  status         text NOT NULL DEFAULT 'building'
                 CHECK (status IN ('building','ready','stale','error')),
  description    text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  dws.data_mart IS '医院数据中台-数据集市元数据注册表（M150-C，持续优化）';
COMMENT ON COLUMN dws.data_mart.mart_name IS '集市业务唯一键';
COMMENT ON COLUMN dws.data_mart.row_count IS '最近一次刷新物化行数';
COMMENT ON COLUMN dws.data_mart.last_refreshed IS '最近一次成功刷新时间';

-- 管理端列表按主题分类 + 刷新时间倒序扫描
CREATE INDEX IF NOT EXISTS idx_data_mart_category_refreshed
  ON dws.data_mart (category, last_refreshed DESC);

-- 待刷新（stale）集市巡检高频过滤
CREATE INDEX IF NOT EXISTS idx_data_mart_status
  ON dws.data_mart (status)
  WHERE status = 'stale';
