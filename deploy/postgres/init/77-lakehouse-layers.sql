-- ============================================================================
-- 健澜科技杠OS - 数据湖仓分层与增量加工（M5-D）
-- 77-lakehouse-layers.sql
--
-- 面向 M5「数据中台 / 医疗大数据湖仓」：
--  - dwd 明细层：业务库清洗、标准化后的贴源明细（就诊、收费）；
--  - dws 汇总层：按 日期+科室+类型 的轻度汇总；
--  - ads 应用层：面向院级日指标 / 院长驾驶舱；
--  - meta 元数据：ETL 作业定义、运行批次（watermark/行数/状态）、数据血缘。
--
-- 加工原则：
--  - 增量：基于源表 updated_at watermark，幂等 UPSERT，可重跑；
--  - 分层：clinical（业务）→ dwd（明细）→ dws（汇总）→ ads（指标）；
--  - 不修改业务库，只读取；湖仓层可任意重建。
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS dwd;
CREATE SCHEMA IF NOT EXISTS dws;
CREATE SCHEMA IF NOT EXISTS ads;
CREATE SCHEMA IF NOT EXISTS meta;

-- ----------------------------------------------------------------------------
-- DWD 明细层
-- ----------------------------------------------------------------------------

-- 就诊明细（门诊/住院/急诊统一贴源，标准化日期与类型）
CREATE TABLE IF NOT EXISTS dwd.visit_detail (
  visit_id            uuid PRIMARY KEY,
  patient_id          uuid NOT NULL,
  visit_no            text,
  visit_type          text,
  department          text,
  campus_id           uuid,
  attending_doctor_id uuid,
  status              text,
  triage_level        text,
  visit_date          date,
  admit_at            timestamptz,
  discharge_at        timestamptz,
  total_fee           numeric(14,2),
  source_updated_at   timestamptz,
  etl_loaded_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dwd_visit_detail_patient
  ON dwd.visit_detail(patient_id);
CREATE INDEX IF NOT EXISTS idx_dwd_visit_detail_date
  ON dwd.visit_detail(visit_date);

-- 收费明细
CREATE TABLE IF NOT EXISTS dwd.fee_item_detail (
  fee_item_id        uuid PRIMARY KEY,
  patient_id         uuid,
  visit_id           uuid,
  department         text,
  category           text,
  item_code          text,
  item_name          text,
  quantity           numeric(14,2),
  unit_price         numeric(14,2),
  amount             numeric(14,2),
  status             text,
  source_type        text,
  source_created_at  timestamptz,
  source_updated_at  timestamptz,
  etl_loaded_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dwd_fee_detail_visit
  ON dwd.fee_item_detail(visit_id);
CREATE INDEX IF NOT EXISTS idx_dwd_fee_detail_created
  ON dwd.fee_item_detail(source_created_at);

-- ----------------------------------------------------------------------------
-- DWS 汇总层：科室 + 日期 + 类型
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dws.dept_daily_summary (
  stat_date    date NOT NULL,
  department   text NOT NULL,
  visit_type   text NOT NULL,
  visit_count  integer NOT NULL DEFAULT 0,
  fee_total    numeric(14,2) NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stat_date, department, visit_type)
);

-- ----------------------------------------------------------------------------
-- ADS 应用层：院级日指标
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ads.hospital_daily_metrics (
  stat_date         date PRIMARY KEY,
  outpatient_visits integer NOT NULL DEFAULT 0,
  inpatient_visits  integer NOT NULL DEFAULT 0,
  emergency_visits  integer NOT NULL DEFAULT 0,
  total_visits      integer NOT NULL DEFAULT 0,
  total_revenue     numeric(14,2) NOT NULL DEFAULT 0,
  avg_fee_per_visit numeric(14,2) NOT NULL DEFAULT 0,
  etl_loaded_at     timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- META 元数据：作业定义 / 运行批次 / 血缘
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS meta.etl_jobs (
  job_code      text PRIMARY KEY,
  job_name      text NOT NULL,
  layer         text NOT NULL CHECK (layer IN ('dwd','dws','ads')),
  source_tables text[] NOT NULL DEFAULT '{}',
  target_table  text NOT NULL,
  enabled       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meta.etl_job_runs (
  run_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code       text NOT NULL REFERENCES meta.etl_jobs(job_code),
  run_mode       text NOT NULL CHECK (run_mode IN ('full','incremental')),
  status         text NOT NULL DEFAULT 'running'
                   CHECK (status IN ('running','success','failed')),
  watermark_from timestamptz,
  watermark_to   timestamptz,
  rows_read      integer NOT NULL DEFAULT 0,
  rows_written   integer NOT NULL DEFAULT 0,
  error_message  text,
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_etl_runs_job
  ON meta.etl_job_runs(job_code, started_at DESC);

CREATE TABLE IF NOT EXISTS meta.data_lineage (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code       text NOT NULL REFERENCES meta.etl_jobs(job_code),
  source_table   text NOT NULL,
  target_table   text NOT NULL,
  transformation text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_code, source_table, target_table)
);

-- ----------------------------------------------------------------------------
-- 权限码
--    data_warehouse:read  查看分层指标、作业历史、血缘
--    data_warehouse:admin 触发 ETL 加工（重跑/全量）
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('data_warehouse:read', '数据湖仓查看', 'data-warehouse', '查看 DWD/DWS/ADS 指标、ETL 作业历史与数据血缘'),
  ('data_warehouse:admin', '数据湖仓加工', 'data-warehouse', '触发增量/全量 ETL 加工与重跑')
ON CONFLICT (code) DO NOTHING;

-- 授予角色：admin 全权；doctor 仅查看（科室运营指标）；其余角色不授予，越权 403
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'data_warehouse:read'),
  ('admin', 'data_warehouse:admin'),
  ('doctor', 'data_warehouse:read')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 作业定义与血缘（与加工引擎一一对应）
-- ----------------------------------------------------------------------------
INSERT INTO meta.etl_jobs (job_code, job_name, layer, source_tables, target_table) VALUES
  ('dwd_visit', '就诊明细抽取', 'dwd',
     ARRAY['clinical.visits'], 'dwd.visit_detail'),
  ('dwd_fee', '收费明细抽取', 'dwd',
     ARRAY['clinical.fee_items'], 'dwd.fee_item_detail'),
  ('dws_dept_daily', '科室日汇总加工', 'dws',
     ARRAY['dwd.visit_detail','dwd.fee_item_detail'], 'dws.dept_daily_summary'),
  ('ads_hospital_daily', '院级日指标加工', 'ads',
     ARRAY['dws.dept_daily_summary'], 'ads.hospital_daily_metrics')
ON CONFLICT (job_code) DO NOTHING;

INSERT INTO meta.data_lineage (job_code, source_table, target_table, transformation) VALUES
  ('dwd_visit', 'clinical.visits', 'dwd.visit_detail', '清洗标准化就诊类型/日期，贴源 UPSERT'),
  ('dwd_fee', 'clinical.fee_items', 'dwd.fee_item_detail', '收费明细贴源 UPSERT'),
  ('dws_dept_daily', 'dwd.visit_detail', 'dws.dept_daily_summary', '按日期+科室+类型聚合就诊量与费用'),
  ('dws_dept_daily', 'dwd.fee_item_detail', 'dws.dept_daily_summary', '按日期+科室汇总收费金额'),
  ('ads_hospital_daily', 'dws.dept_daily_summary', 'ads.hospital_daily_metrics', '按日期汇总院级就诊量/收入/均次费用')
ON CONFLICT (job_code, source_table, target_table) DO NOTHING;
