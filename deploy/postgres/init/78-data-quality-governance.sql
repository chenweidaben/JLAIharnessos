-- ============================================================================
-- 健澜科技杠OS - 数据质量监控与隐私分级台账（M5-E）
-- 78-data-quality-governance.sql
--
-- 面向 M5「数据中台 / 数据治理」收尾：
--  - 数据质量规则：完整性 / 唯一性 / 有效性 / 一致性 / 及时性 五维；
--  - 检测运行：对真实业务表执行 SQL 检测，登记通过/失败行与失败样本；
--  - 质量评分：按运行汇总通过率与质量评分；
--  - 隐私分级台账：字段级 L1-L4 分级（自动扫描 + 人工修正留痕）。
--
-- 设计原则：
--  - 规则结构化存储（check_type + params），由引擎生成真实 SQL，不硬编码；
--  - 检测只读业务表，结果可任意重建；检测结果与运行同事务登记；
--  - 幂等：可重复执行，规则/授权用 ON CONFLICT 兜底。
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 数据质量规则定义
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta.dq_rules (
  rule_code     text PRIMARY KEY,
  rule_name     text NOT NULL,
  dimension     text NOT NULL CHECK (dimension IN
                  ('completeness','uniqueness','validity','consistency','timeliness')),
  target_schema text NOT NULL,
  target_table  text NOT NULL,
  target_column text,
  check_type    text NOT NULL CHECK (check_type IN
                  ('not_null','unique','valid_values','valid_regex',
                   'fk_exists','conditional_not_null')),
  params        jsonb NOT NULL DEFAULT '{}',
  severity      text NOT NULL DEFAULT 'major'
                  CHECK (severity IN ('critical','major','minor')),
  enabled       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 检测运行批次
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta.dq_runs (
  run_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_mode     text NOT NULL DEFAULT 'full' CHECK (run_mode IN ('full','incremental')),
  status       text NOT NULL DEFAULT 'running'
                 CHECK (status IN ('running','success','failed')),
  total_rules  integer NOT NULL DEFAULT 0,
  passed_rules integer NOT NULL DEFAULT 0,
  failed_rules integer NOT NULL DEFAULT 0,
  score        numeric(5,2),
  triggered_by uuid REFERENCES iam.users(id),
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz
);

-- ----------------------------------------------------------------------------
-- 检测结果（每条规则在每次运行中的通过/失败统计与样本）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta.dq_results (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid NOT NULL REFERENCES meta.dq_runs(run_id),
  rule_code     text NOT NULL,
  total_rows    bigint NOT NULL DEFAULT 0,
  passed_rows   bigint NOT NULL DEFAULT 0,
  failed_rows   bigint NOT NULL DEFAULT 0,
  pass_rate     numeric(5,2),
  failed_sample jsonb NOT NULL DEFAULT '[]',
  status        text NOT NULL CHECK (status IN ('pass','fail')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dq_results_run ON meta.dq_results(run_id);
CREATE INDEX IF NOT EXISTS idx_dq_results_rule ON meta.dq_results(rule_code);

-- ----------------------------------------------------------------------------
-- 隐私分级台账（字段级 L1-L4，自动 + 人工修正）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta.field_classification (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_name text NOT NULL,
  table_name  text NOT NULL,
  column_name text NOT NULL,
  level       smallint NOT NULL CHECK (level BETWEEN 1 AND 4),
  source      text NOT NULL CHECK (source IN ('auto','manual')),
  reason      text,
  overridden_by uuid REFERENCES iam.users(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schema_name, table_name, column_name)
);

-- ----------------------------------------------------------------------------
-- 权限码
--    data_governance:read   查看质量评分/检测结果/分级台账
--    data_governance:admin  触发质量检测、人工修正分级
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('data_governance:read', '数据治理查看', 'data-governance',
     '查看数据质量评分、检测结果与隐私分级台账'),
  ('data_governance:admin', '数据治理管理', 'data-governance',
     '触发数据质量检测、人工修正字段分级')
ON CONFLICT (code) DO NOTHING;

-- 授予角色：admin 全权；doctor 仅查看（数据治理态势）；其余角色不授予
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'data_governance:read'),
  ('admin', 'data_governance:admin'),
  ('doctor', 'data_governance:read')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 内置质量规则（覆盖患者主索引与就诊主表的关键质量项）
-- params 字段含义：
--   allowed_values 数组：允许取值；
--   ref_schema/ref_table/ref_column：外键引用；
--   condition：条件式非空的前提（SQL 片段，参数随规则固定，不含用户输入）。
-- ----------------------------------------------------------------------------
INSERT INTO meta.dq_rules
  (rule_code, rule_name, dimension, target_schema, target_table, target_column,
   check_type, params, severity) VALUES
-- 完整性 completeness
  ('PAT_MRN_NOT_NULL', '患者病历号非空', 'completeness',
     'clinical', 'patients', 'mrn', 'not_null', '{}', 'critical'),
  ('PAT_NAME_NOT_NULL', '患者脱敏姓名非空', 'completeness',
     'clinical', 'patients', 'name_masked', 'not_null', '{}', 'critical'),
  ('PAT_GENDER_NOT_NULL', '患者性别非空', 'completeness',
     'clinical', 'patients', 'gender', 'not_null', '{}', 'major'),
  ('PAT_BIRTH_NOT_NULL', '患者出生日期非空', 'completeness',
     'clinical', 'patients', 'birth_date', 'not_null', '{}', 'major'),
  ('VISIT_NO_NOT_NULL', '就诊号非空', 'completeness',
     'clinical', 'visits', 'visit_no', 'not_null', '{}', 'critical'),
  ('VISIT_DEPT_NOT_NULL', '就诊科室非空', 'completeness',
     'clinical', 'visits', 'department', 'not_null', '{}', 'major'),
-- 唯一性 uniqueness
  ('PAT_MRN_UNIQUE', '患者病历号唯一', 'uniqueness',
     'clinical', 'patients', 'mrn', 'unique', '{}', 'critical'),
  ('VISIT_NO_UNIQUE', '就诊号唯一', 'uniqueness',
     'clinical', 'visits', 'visit_no', 'unique', '{}', 'critical'),
-- 有效性 validity
  ('PAT_GENDER_VALID', '患者性别取值合法', 'validity',
     'clinical', 'patients', 'gender', 'valid_values',
     '{"allowed_values":["男","女","未知","未说明"]}', 'major'),
  ('PAT_LEVEL_VALID', '患者数据分级取值合法', 'validity',
     'clinical', 'patients', 'data_level', 'valid_values',
     '{"allowed_values":[1,2,3,4]}', 'major'),
  ('VISIT_TYPE_VALID', '就诊类型取值合法', 'validity',
     'clinical', 'visits', 'visit_type', 'valid_values',
     '{"allowed_values":["outpatient","emergency","inpatient","checkup"]}', 'major'),
  ('VISIT_STATUS_VALID', '就诊状态取值合法', 'validity',
     'clinical', 'visits', 'status', 'valid_values',
     '{"allowed_values":["ongoing","discharged","transferred","cancelled"]}', 'major'),
-- 一致性 consistency（外键存在）
  ('VISIT_PAT_FK', '就诊患者外键有效', 'consistency',
     'clinical', 'visits', 'patient_id', 'fk_exists',
     '{"ref_schema":"clinical","ref_table":"patients","ref_column":"id"}', 'critical'),
  ('VISIT_DOC_FK', '就诊主治医师外键有效', 'consistency',
     'clinical', 'visits', 'attending_doctor_id', 'fk_exists',
     '{"ref_schema":"iam","ref_table":"users","ref_column":"id"}', 'major'),
-- 及时性 timeliness（出院患者须有出院时间）
  ('VISIT_DISCHARGE_TIME', '出院患者出院时间非空', 'timeliness',
     'clinical', 'visits', 'discharge_at', 'conditional_not_null',
     '{"condition":"status = ''discharged''"}', 'major')
ON CONFLICT (rule_code) DO NOTHING;
