-- ============================================================================
-- 健澜科技 jlmedaios · M159-D 数据质量治理（中期路线图）
-- 321-data-quality.sql
--
-- 在 M5-E（78-data-quality-governance.sql 的 meta.dq_rules）之上，沉淀一张
-- 面向"管理驾驶舱"的数据质量规则台账 meta.data_quality_rule：
--   - 五维：完整性 completeness / 准确性 accuracy / 一致性 consistency /
--           及时性 timeliness / 唯一性 uniqueness；
--   - 每条规则绑定目标库.表.字段、检查类型、阈值、严重度与启停开关；
--   - BFF 纯函数层（dataQualityAggregator.ts）按本表配置对真实业务表抽检。
--
-- 与既有 meta.dq_rules 的关系：
--   - dq_rules 是"检测引擎"规则（check_type 生成 SQL，落 dq_runs/dq_results）；
--   - data_quality_rule 是"治理台账"规则（面向 admin 质量报告页，路由层取数后
--     交由纯函数 checkDataQuality 判定）。两者互补，互不覆盖。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 数据质量规则台账
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta.data_quality_rule (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code     text NOT NULL UNIQUE,
  rule_name     text NOT NULL,
  -- 五维：完整性/准确性/一致性/及时性/唯一性
  dimension     text NOT NULL CHECK (dimension IN
                  ('completeness','accuracy','consistency','timeliness','uniqueness')),
  target_schema text NOT NULL DEFAULT 'clinical',
  target_table  text NOT NULL,
  target_column text NOT NULL,
  -- 检查类型：not_null / unique / valid_values / valid_regex / fk_exists / fresh_within
  check_type    text NOT NULL CHECK (check_type IN
                  ('not_null','unique','valid_values','valid_regex',
                   'fk_exists','fresh_within')),
  -- 达标阈值（百分比 0..100），如完整性 95
  threshold     numeric(5,2) NOT NULL DEFAULT 95.00,
  -- 规则参数：值域/被引用表/时效小时数等
  params        jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity      text NOT NULL DEFAULT 'major'
                CHECK (severity IN ('critical','major','minor')),
  enabled       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dq_rule_lookup
  ON meta.data_quality_rule(target_schema, target_table, enabled);
CREATE INDEX IF NOT EXISTS idx_dq_rule_dimension
  ON meta.data_quality_rule(dimension);

DROP TRIGGER IF EXISTS trg_meta_dq_rule_updated ON meta.data_quality_rule;
CREATE TRIGGER trg_meta_dq_rule_updated BEFORE UPDATE ON meta.data_quality_rule
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
--   data_quality:read  查看数据质量报告与问题定位（admin/质控）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('data_quality:read', '数据质量报告只读', 'data-quality',
     '查看 admin 数据质量报告页：五维达标率、综合评分与问题定位清单')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'data_quality:read')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 内置规则种子（覆盖患者主索引与就诊主表关键质量项；ON CONFLICT 兜底）
-- ---------------------------------------------------------------------------
INSERT INTO meta.data_quality_rule
  (rule_code, rule_name, dimension, target_schema, target_table, target_column,
   check_type, threshold, params, severity) VALUES
-- 完整性 completeness（非空率 ≥ 95%）
  ('DQ_PAT_MRN_NOT_NULL', '患者病历号非空率', 'completeness',
     'clinical', 'patients', 'mrn', 'not_null', 95.00, '{}', 'critical'),
  ('DQ_PAT_NAME_NOT_NULL', '患者姓名非空率', 'completeness',
     'clinical', 'patients', 'name_masked', 'not_null', 95.00, '{}', 'critical'),
  ('DQ_VISIT_NO_NOT_NULL', '就诊号非空率', 'completeness',
     'clinical', 'visits', 'visit_no', 'not_null', 95.00, '{}', 'critical'),
-- 唯一性 uniqueness（主键零容忍）
  ('DQ_PAT_MRN_UNIQUE', '患者病历号唯一性', 'uniqueness',
     'clinical', 'patients', 'mrn', 'unique', 100.00, '{}', 'critical'),
  ('DQ_VISIT_NO_UNIQUE', '就诊号唯一性', 'uniqueness',
     'clinical', 'visits', 'visit_no', 'unique', 100.00, '{}', 'critical'),
-- 准确性 accuracy（值域 / 格式）
  ('DQ_PAT_GENDER_VALID', '患者性别取值合法', 'accuracy',
     'clinical', 'patients', 'gender', 'valid_values', 98.00,
     '{"allowed_values":["男","女","未知","未说明"]}', 'major'),
  ('DQ_VISIT_TYPE_VALID', '就诊类型取值合法', 'accuracy',
     'clinical', 'visits', 'visit_type', 'valid_values', 98.00,
     '{"allowed_values":["outpatient","emergency","inpatient","checkup"]}', 'major'),
-- 一致性 consistency（跨表外键存在）
  ('DQ_VISIT_PAT_FK', '就诊患者外键一致', 'consistency',
     'clinical', 'visits', 'patient_id', 'fk_exists', 100.00,
     '{"ref_schema":"clinical","ref_table":"patients","ref_column":"id"}', 'critical'),
-- 及时性 timeliness（更新时间 ≤ 24h）
  ('DQ_VISIT_FRESH', '就诊记录更新时效', 'timeliness',
     'clinical', 'visits', 'updated_at', 'fresh_within', 95.00,
     '{"max_age_hours":24}', 'major')
ON CONFLICT (rule_code) DO NOTHING;
