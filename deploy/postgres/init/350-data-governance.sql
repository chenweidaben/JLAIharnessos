-- ============================================================================
-- 健澜AI原生医院操作系统OS - 深度数据治理规则库（M175-A · 质量与新场景）
-- 350-data-governance.sql
--
-- 主张：数据治理要真治理，不是建表就完。
--   在 M5-E meta.dq_rules（执行型 SQL 检测规则）之上，沉淀一套覆盖
--   「四大治理域」的治理规则库 meta.data_quality_rule：
--     1. 数据标准 standard  —— 命名规范 / 数据类型 / 值域；
--     2. 数据质量 quality   —— 完整性 / 准确性 / 一致性 / 及时性 / 唯一性；
--     3. 数据安全 security  —— 分级分类 / 脱敏 / 访问控制；
--     4. 数据生命周期 lifecycle —— 创建 / 存储 / 使用 / 归档 / 销毁。
--
-- 与 dq_rules 的分工：
--   - dq_rules 是「检测引擎规则」，按 check_type 生成只读 SQL；
--   - data_quality_rule 是「治理制度规则」，承载治理域、责任岗、达标线、
--     处置动作与生命周期要求，作为深度治理驾驶舱（GET /api/v1/admin/data/governance）
--     与纯函数 runDataQualityCheck / generateDataQualityReport 的制度台账。
--
-- 设计原则：幂等可重复执行；规则结构化（rule_expression jsonb）不硬编码；
--           写操作留痕（updated_by/updated_at）。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 深度数据治理规则库
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta.data_quality_rule (
  rule_code        text PRIMARY KEY,
  rule_name        text NOT NULL,
  -- 四大治理域：standard / quality / security / lifecycle
  governance_domain text NOT NULL CHECK (governance_domain IN
                      ('standard','quality','security','lifecycle')),
  -- 治理子维度（命名规范/数据类型/值域；完整性/准确性/一致性/及时性/唯一性；
  -- 分级分类/脱敏/访问控制；创建/存储/使用/归档/销毁）
  dimension        text NOT NULL,
  target_table     text NOT NULL DEFAULT '*',
  target_field     text,
  -- 检查类型：与纯函数 runDataQualityCheck 对齐
  check_type       text NOT NULL CHECK (check_type IN
                      ('not_null','unique','range','non_negative',
                       'regex','enum','referential','freshness')),
  -- 规则参数（值域/上下限/正则/允许集/新鲜度天数等），结构化不硬编码
  rule_expression  jsonb NOT NULL DEFAULT '{}',
  severity         text NOT NULL DEFAULT 'major'
                     CHECK (severity IN ('critical','major','minor')),
  -- 达标线（合格率%）与责任岗
  threshold_pct    numeric(5,2) NOT NULL DEFAULT 100.00,
  owner_role       text NOT NULL DEFAULT '数据治理岗',
  -- 不达标处置动作
  remediation      text,
  enabled          boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid REFERENCES iam.users(id)
);

CREATE INDEX IF NOT EXISTS idx_dqr_domain
  ON meta.data_quality_rule(governance_domain);
CREATE INDEX IF NOT EXISTS idx_dqr_dimension
  ON meta.data_quality_rule(dimension);
CREATE INDEX IF NOT EXISTS idx_dqr_enabled
  ON meta.data_quality_rule(enabled) WHERE enabled;
CREATE INDEX IF NOT EXISTS idx_dqr_target
  ON meta.data_quality_rule(target_table, target_field);

-- ----------------------------------------------------------------------------
-- 内置治理规则（覆盖四大治理域 14 个治理子项）
-- ----------------------------------------------------------------------------
INSERT INTO meta.data_quality_rule
  (rule_code, rule_name, governance_domain, dimension, target_table, target_field,
   check_type, rule_expression, severity, threshold_pct, owner_role, remediation)
VALUES
-- ===== 数据标准 standard：命名规范 / 数据类型 / 值域 =====
  ('STD_NAMING_CONVENTION', '对象命名遵循小写蛇形命名规范',
     'standard', '命名规范', '*', NULL,
     'regex', '{"pattern":"^[a-z][a-z0-9_]*$"}', 'major', 100.00,
     '数据治理岗', '反范式改名，纳入数据标准评审'),
  ('STD_TYPE_CONSISTENT',   '同名字段跨表数据类型一致',
     'standard', '数据类型', '*', NULL,
     'enum', '{"allowed":["uuid","text","timestamptz","numeric","integer","boolean"]}',
     'major', 100.00, '数据治理岗', '统一字段类型并做迁移脚本'),
  ('STD_GENDER_ENUM',       '性别取值域受控',
     'standard', '值域', 'clinical.patients', 'gender',
     'enum', '{"allowed":["男","女","未知","未说明"]}', 'major', 100.00,
     '主数据岗', '脏数据清洗回写主数据'),
  ('STD_VISIT_TYPE_ENUM',   '就诊类型取值域受控',
     'standard', '值域', 'clinical.visits', 'visit_type',
     'enum', '{"allowed":["outpatient","emergency","inpatient","checkup"]}',
     'major', 100.00, '主数据岗', '字典对齐后批量修正'),

-- ===== 数据质量 quality：完整性/准确性/一致性/及时性/唯一性 =====
  ('DQR_PAT_MRN_NOT_NULL',  '患者病历号完整性',
     'quality', '完整性', 'clinical.patients', 'mrn',
     'not_null', '{}', 'critical', 100.00,
     '主数据岗', '补录 MRN，阻断无号建档'),
  ('DQR_PAT_AGE_RANGE',     '年龄准确性（生理区间 0-150）',
     'quality', '准确性', 'clinical.patients', 'age',
     'range', '{"min":0,"max":150}', 'critical', 99.50,
     '临床数据岗', '异常值双人复核并修正'),
  ('DQR_PAT_WEIGHT_RANGE',  '体重准确性（kg，0.5-300）',
     'quality', '准确性', 'clinical.observations', 'weight_kg',
     'range', '{"min":0.5,"max":300}', 'major', 99.00,
     '护理数据岗', '回查录入，纠正单位错误'),
  ('DQR_VISIT_PAT_FK',      '就诊-患者引用一致性',
     'quality', '一致性', 'clinical.visits', 'patient_id',
     'referential', '{"ref":"clinical.patients.id"}', 'critical', 100.00,
     '集成平台岗', '孤儿就诊记录隔离并溯源'),
  ('DQR_VISIT_FRESHNESS',   '就诊主数据及时性（24h 内入库）',
     'quality', '及时性', 'clinical.visits', 'created_at',
     'freshness', '{"maxAgeHours":24}', 'major', 98.00,
     '集成平台岗', '检查接口积压与失败重试'),
  ('DQR_PAT_MRN_UNIQUE',    '患者病历号唯一性（EMPI 去重）',
     'quality', '唯一性', 'clinical.patients', 'mrn',
     'unique', '{}', 'critical', 100.00,
     '主数据岗', 'EMPI 合并重复主索引'),

-- ===== 数据安全 security：分级分类 / 脱敏 / 访问控制 =====
  ('SEC_FIELD_CLASSIFIED',  '敏感字段分级分类覆盖率',
     'security', '分级分类', '*', NULL,
     'not_null', '{}', 'critical', 99.00,
     '数据安全岗', '未分类字段补标 L1-L4'),
  ('SEC_PII_MASKED',        'PII 字段对外输出脱敏',
     'security', '脱敏', 'clinical.patients', 'id_card',
     'regex', '{"pattern":"^\\*{6,}[0-9Xx]{4}$"}', 'critical', 100.00,
     '数据安全岗', '出口脱敏规则修复，全量回扫'),
  ('SEC_ACCESS_CONTROLLED', '敏感表访问受控（最小权限）',
     'security', '访问控制', '*', NULL,
     'enum', '{"allowed":["rbac","abac"]}', 'major', 100.00,
     '权限治理岗', '回收越权账号，按角色收敛'),

-- ===== 数据生命周期 lifecycle：创建/存储/使用/归档/销毁 =====
  ('LC_CREATED_AUDITED',    '数据创建留痕审计',
     'lifecycle', '创建', '*', NULL,
     'not_null', '{}', 'major', 100.00,
     '数据治理岗', '补审计字段，接入审计链'),
  ('LC_STORAGE_ENCRYPTED',  '敏感数据静态存储加密',
     'lifecycle', '存储', '*', NULL,
     'enum', '{"allowed":["aes256","kms"]}', 'critical', 100.00,
     '数据安全岗', '未加密卷整改并轮换密钥'),
  ('LC_USING_PURPOSE_LIMIT','数据使用遵循最小必要原则',
     'lifecycle', '使用', '*', NULL,
     'not_null', '{}', 'major', 99.00,
     '数据安全岗', '超目的调用纳入审批'),
  ('LC_ARCHIVE_POLICY',     '过期历史数据按策略归档',
     'lifecycle', '归档', 'clinical.visits', NULL,
     'freshness', '{"maxAgeYears":15}', 'minor', 95.00,
     '数据治理岗', '触达归档期数据迁入冷存储'),
  ('LC_DESTROY_CERTIFIED',  '到期数据销毁留痕可核验',
     'lifecycle', '销毁', '*', NULL,
     'not_null', '{}', 'critical', 100.00,
     '数据安全岗', '补销毁证明，闭环监管报送')
ON CONFLICT (rule_code) DO UPDATE SET
  rule_name       = EXCLUDED.rule_name,
  governance_domain = EXCLUDED.governance_domain,
  dimension       = EXCLUDED.dimension,
  target_table    = EXCLUDED.target_table,
  target_field    = EXCLUDED.target_field,
  check_type      = EXCLUDED.check_type,
  rule_expression = EXCLUDED.rule_expression,
  severity        = EXCLUDED.severity,
  threshold_pct   = EXCLUDED.threshold_pct,
  owner_role      = EXCLUDED.owner_role,
  remediation     = EXCLUDED.remediation,
  updated_at      = now();
