-- ============================================================================
-- 健澜AI原生医院操作系统OS - M133-A 多医院数据隔离：核心表行级 hospital_id
-- 261-multi-tenant.sql
--
-- 【SaaS化+智慧度】面向 SaaS 化多院部署，把医院（租户）归属下沉到核心业务行：
--  - 一家三甲集团下挂 N 家医院 / N 个院区，每家医院数据物理同库、逻辑强隔离；
--  - 所有核心表新增 hospital_id（= iam.tenants(id)，level='hospital'），
--    查询必须强制叠加 hospital_id 谓词（见 src/bff/aggregators/tenantAggregator.ts）；
--  - 智慧度底座：院级看板、集团对比、跨院科研均以 hospital_id 为分片键聚合。
--
-- 隔离红线（安全）：
--  - hospital_id 一律 NOT NULL，历史行回填默认医院 'demo-hospital'，杜绝空串院数据；
--  - 外键强约束到 iam.tenants(id)，引用不存在的医院直接落库失败；
--  - 本迁移只加列与索引，不改业务语义；谓词叠加由 BFF 纯函数 withTenantScope 统一收口。
--
-- 幂等：全部 IF NOT EXISTS / DROP CONSTRAINT IF EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- SPDX-License-Identifier: Apache-2.0
-- ============================================================================

-- 默认医院 id（与 74-multi-tenant.sql / TenantService 默认值一致）：
-- 历史存量行统一回填到默认医院，保证 NOT NULL 约束成立。

-- ----------------------------------------------------------------------------
-- 1. 医护/员工归属：员工属于哪家医院
-- ----------------------------------------------------------------------------
ALTER TABLE iam.users
  ADD COLUMN IF NOT EXISTS hospital_id text NOT NULL DEFAULT 'demo-hospital';

ALTER TABLE iam.users
  DROP CONSTRAINT IF EXISTS users_hospital_id_fkey;
ALTER TABLE iam.users
  ADD CONSTRAINT users_hospital_id_fkey
  FOREIGN KEY (hospital_id) REFERENCES iam.tenants(id);

CREATE INDEX IF NOT EXISTS idx_users_hospital
  ON iam.users(hospital_id) WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 2. 患者主索引：患者归属首诊医院（跨院转院不改首诊归属，转诊由 visits 体现）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.patients
  ADD COLUMN IF NOT EXISTS hospital_id text NOT NULL DEFAULT 'demo-hospital';

ALTER TABLE clinical.patients
  DROP CONSTRAINT IF EXISTS patients_hospital_id_fkey;
ALTER TABLE clinical.patients
  ADD CONSTRAINT patients_hospital_id_fkey
  FOREIGN KEY (hospital_id) REFERENCES iam.tenants(id);

CREATE INDEX IF NOT EXISTS idx_patients_hospital
  ON clinical.patients(hospital_id) WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 3. 就诊（门诊/急诊/住院/体检）：每一次就诊严格归属其发生医院
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.visits
  ADD COLUMN IF NOT EXISTS hospital_id text NOT NULL DEFAULT 'demo-hospital';

ALTER TABLE clinical.visits
  DROP CONSTRAINT IF EXISTS visits_hospital_id_fkey;
ALTER TABLE clinical.visits
  ADD CONSTRAINT visits_hospital_id_fkey
  FOREIGN KEY (hospital_id) REFERENCES iam.tenants(id);

CREATE INDEX IF NOT EXISTS idx_visits_hospital
  ON clinical.visits(hospital_id, admit_at DESC);

-- ----------------------------------------------------------------------------
-- 4. 医嘱：医嘱随就诊走，归属就诊医院
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.orders
  ADD COLUMN IF NOT EXISTS hospital_id text NOT NULL DEFAULT 'demo-hospital';

ALTER TABLE clinical.orders
  DROP CONSTRAINT IF EXISTS orders_hospital_id_fkey;
ALTER TABLE clinical.orders
  ADD CONSTRAINT orders_hospital_id_fkey
  FOREIGN KEY (hospital_id) REFERENCES iam.tenants(id);

CREATE INDEX IF NOT EXISTS idx_orders_hospital
  ON clinical.orders(hospital_id);

-- ----------------------------------------------------------------------------
-- 5. 病历主记录（病案首页/病历头）：病历文书归属书写医院
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.medical_record_headers
  ADD COLUMN IF NOT EXISTS hospital_id text NOT NULL DEFAULT 'demo-hospital';

ALTER TABLE clinical.medical_record_headers
  DROP CONSTRAINT IF EXISTS med_headers_hospital_id_fkey;
ALTER TABLE clinical.medical_record_headers
  ADD CONSTRAINT med_headers_hospital_id_fkey
  FOREIGN KEY (hospital_id) REFERENCES iam.tenants(id);

CREATE INDEX IF NOT EXISTS idx_med_headers_hospital
  ON clinical.medical_record_headers(hospital_id);

-- ----------------------------------------------------------------------------
-- 隔离校验：列已 NOT NULL 杜绝空院脏行；运行时行级过滤见
-- tenantAggregator.filterRowsByScope（fail-closed，无 hospital_id 一律不可见）。
-- ----------------------------------------------------------------------------
