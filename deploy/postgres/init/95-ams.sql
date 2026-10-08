-- ============================================================================
-- 健澜科技 jlmedaios · M14-A 抗菌药物临床应用管理（AMS）闭环
--
--  依据国家《抗菌药物临床应用管理办法》、《处方管理办法》与三甲评审、合理用药监测要求，
--  补齐抗菌药物分级管理的数据底座：
--   - clinical.antibiotic_catalog  抗菌药物分级目录（非限制/限制/特殊使用级 + 药理分类
--     + WHO DDD 限定日剂量），按 drug_catalog 主键关联；
--   - clinical.ams_prescriber_grants 医师抗菌药处方授权（按职称/授权确定可开级别）；
--   - clinical.ams_special_approvals 特殊使用级会诊审批（未审批不得生成医嘱）；
--   - clinical.ams_reviews          处方/医嘱/围术期专项点评（合理/不合理 + 问题类型 + 签名）；
--   - clinical.ams_usage_records     抗菌药使用记录（用于 DDDs / 使用强度 AUD 计算）。
--  质控指标（门诊处方比例、住院使用率、AUD、I 类切口预防用药率、特殊使用占比、微生物送检率）
--  由应用层实时聚合，不在此冗余建表。
--
--  权限码：ams:read 查看，ams:prescribe 抗菌药处方（医师），ams:review 专项点评（药师），
--  ams:approve 特殊使用级审批（抗菌药物管理工作组），ams:audit 质控指标（admin/质控）。
--
-- 医疗安全：AI 不自主开抗菌药；特殊使用级须会诊审批并电子签名后方可生成医嘱；
-- 越权/禁忌拦截；不合理用药须可追溯（哈希链审计）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / DROP TRIGGER IF EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 抗菌药物分级目录（按 drug_catalog.id 一一对应）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.antibiotic_catalog (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_id       uuid NOT NULL UNIQUE REFERENCES clinical.drug_catalog(id),
  generic_name  text,
  -- 非限制使用级 / 限制使用级 / 特殊使用级
  atc_level     text NOT NULL CHECK (atc_level IN ('unrestricted','restricted','special')),
  pharm_class   text NOT NULL CHECK (pharm_class IN (
                  'penicillins','cephalosporin_1','cephalosporin_2','cephalosporin_3',
                  'cephalosporin_4','quinolones','carbapenems','macrolides',
                  'glycopeptides','nitroimidazole','other')),
  ddd           numeric(10,2) NOT NULL,            -- WHO 限定日剂量（g/日）
  ddd_unit      text NOT NULL DEFAULT 'g',
  default_route text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_abx_catalog_level ON clinical.antibiotic_catalog(atc_level);
CREATE INDEX IF NOT EXISTS idx_abx_catalog_class ON clinical.antibiotic_catalog(pharm_class);
DROP TRIGGER IF EXISTS trg_clinical_abx_catalog_updated ON clinical.antibiotic_catalog;
CREATE TRIGGER trg_clinical_abx_catalog_updated BEFORE UPDATE ON clinical.antibiotic_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 医师抗菌药处方授权（按 prescriber 唯一，CAS 状态机）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.ams_prescriber_grants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescriber_id uuid NOT NULL UNIQUE REFERENCES iam.users(id),
  max_level     text NOT NULL CHECK (max_level IN ('unrestricted','restricted','special')),
  granted_by    uuid REFERENCES iam.users(id),
  granted_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_clinical_ams_grant_updated ON clinical.ams_prescriber_grants;
CREATE TRIGGER trg_clinical_ams_grant_updated BEFORE UPDATE ON clinical.ams_prescriber_grants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 特殊使用级会诊审批（pending -> approved / rejected；approved 才生成医嘱）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.ams_special_approvals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_no   text NOT NULL UNIQUE,
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id    uuid NOT NULL,
  prescriber_id uuid NOT NULL,
  drug_id       uuid NOT NULL,
  indication    text,
  consultation_opinion text,
  consultant_id uuid REFERENCES iam.users(id),
  approver_id   uuid REFERENCES iam.users(id),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  order_id      uuid,
  reject_reason  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  approved_at   timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ams_special_status ON clinical.ams_special_approvals(status);
CREATE INDEX IF NOT EXISTS idx_ams_special_visit ON clinical.ams_special_approvals(visit_id);
DROP TRIGGER IF EXISTS trg_clinical_ams_special_updated ON clinical.ams_special_approvals;
CREATE TRIGGER trg_clinical_ams_special_updated BEFORE UPDATE ON clinical.ams_special_approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 处方/医嘱/围术期专项点评
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.ams_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_no     text NOT NULL UNIQUE,
  -- perioperative 围术期预防用药 / prescription 门诊处方 / order 住院医嘱
  review_type   text NOT NULL CHECK (review_type IN ('perioperative','prescription','order')),
  target_id     uuid,
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id    uuid NOT NULL,
  result        text NOT NULL CHECK (result IN ('rational','irrational')),
  issue_types   jsonb NOT NULL DEFAULT '[]'::jsonb,
  detail        jsonb NOT NULL DEFAULT '{}'::jsonb,
  status        text NOT NULL DEFAULT 'pending_review'
                CHECK (status IN ('pending_review','signed','returned')),
  reviewer_id   uuid REFERENCES iam.users(id),
  review_note   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  reviewed_at   timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ams_review_status ON clinical.ams_reviews(status);
CREATE INDEX IF NOT EXISTS idx_ams_review_type ON clinical.ams_reviews(review_type, result);
CREATE INDEX IF NOT EXISTS idx_ams_review_visit ON clinical.ams_reviews(visit_id);
DROP TRIGGER IF EXISTS trg_clinical_ams_review_updated ON clinical.ams_reviews;
CREATE TRIGGER trg_clinical_ams_review_updated BEFORE UPDATE ON clinical.ams_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 抗菌药使用记录（DDDs / AUD 计算来源）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.ams_usage_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id     uuid NOT NULL,
  drug_id         uuid NOT NULL,
  order_id        uuid,
  -- prophylactic 预防用药 / therapeutic 治疗用药
  purpose         text NOT NULL CHECK (purpose IN ('prophylactic','therapeutic')),
  dose            numeric(12,2) NOT NULL,
  dose_unit       text NOT NULL,
  frequency       text,
  route           text,
  usage_days      numeric(4,1) NOT NULL DEFAULT 1,
  total_amount    numeric(12,2),                 -- 周期内总消耗量（g）
  culture_sent    boolean NOT NULL DEFAULT false, -- 治疗性使用前是否送检微生物
  administered_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ams_usage_visit ON clinical.ams_usage_records(visit_id);
CREATE INDEX IF NOT EXISTS idx_ams_usage_drug ON clinical.ams_usage_records(drug_id);
CREATE INDEX IF NOT EXISTS idx_ams_usage_purpose ON clinical.ams_usage_records(purpose, administered_at);

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('ams:read',      '抗菌药管理查看',   'clinical', '查看抗菌药分级目录、授权、点评与使用'),
  ('ams:prescribe', '抗菌药处方',       'clinical', '按授权级别开具抗菌药处方/医嘱'),
  ('ams:review',    '抗菌药专项点评',   'clinical', '门诊处方/住院医嘱/围术期预防用药合理性点评'),
  ('ams:approve',   '特殊使用级审批',   'clinical', '特殊使用级抗菌药会诊审批与电子签名'),
  ('ams:audit',     '抗菌药质控指标',   'clinical', '抗菌药使用强度与合理用药质控指标')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'ams:read'      WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='ams:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'ams:prescribe' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='ams:prescribe');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'ams:review'    WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='ams:review');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'ams:approve'   WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='ams:approve');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'ams:audit'     WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='ams:audit');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'ams:read'      WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='ams:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'ams:prescribe' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='ams:prescribe');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'pharmacist', 'ams:read'   WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='pharmacist' AND permission_code='ams:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'pharmacist', 'ams:review' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='pharmacist' AND permission_code='ams:review');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'ams:read' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='ams:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'technician', 'ams:read' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='technician' AND permission_code='ams:read');

-- 抗菌药物管理工作组（审批 + 质控，不开方/不点评）
INSERT INTO iam.roles (code, name, description, is_system)
VALUES ('ams_officer', '抗菌药物管理工作组', '抗菌药物分级管理、特殊使用级审批与质控', true)
ON CONFLICT (code) DO NOTHING;
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'ams_officer', 'ams:read'    WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='ams_officer' AND permission_code='ams:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'ams_officer', 'ams:approve' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='ams_officer' AND permission_code='ams:approve');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'ams_officer', 'ams:audit'   WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='ams_officer' AND permission_code='ams:audit');

-- ---------------------------------------------------------------------------
-- 种子测试账号（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.users (username, name, department, title, role, status)
VALUES
  ('doctor_res',   '住院医师小Res', '普外科',   '住院医师',   'doctor', 'active'),
  ('doctor_zhou',  '周医生',       '心血管内科', '主治医师',   'doctor', 'active'),
  ('ams_approver', '抗菌药审批人', '感染科',     '主任医师',   'doctor', 'active')
ON CONFLICT (username) DO NOTHING;

-- 角色绑定（真实角色取自 user_roles）
INSERT INTO iam.user_roles (user_id, role_code, data_scope)
SELECT u.id, 'doctor', 'department' FROM iam.users u
WHERE u.username IN ('doctor_res','doctor_zhou')
  AND NOT EXISTS (SELECT 1 FROM iam.user_roles ur WHERE ur.user_id = u.id AND ur.role_code='doctor');
INSERT INTO iam.user_roles (user_id, role_code, data_scope)
SELECT u.id, 'ams_officer', 'hospital' FROM iam.users u
WHERE u.username = 'ams_approver'
  AND NOT EXISTS (SELECT 1 FROM iam.user_roles ur WHERE ur.user_id = u.id AND ur.role_code='ams_officer');

-- ---------------------------------------------------------------------------
-- 抗菌药目录种子：先补 drug_catalog（D051-D058），再写分级目录（含 D017-D019）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.drug_catalog
  (drug_code, generic_name, specification, dosage_form, route, unit, category, controlled)
VALUES
  ('D051', '头孢唑林',   '1g/支',     '注射剂', 'ivgtt', '支', '处方药', false),
  ('D052', '头孢曲松',   '1g/支',     '注射剂', 'ivgtt', '支', '处方药', false),
  ('D053', '头孢吡肟',   '1g/支',     '注射剂', 'ivgtt', '支', '处方药', false),
  ('D054', '左氧氟沙星', '0.5g*5片',  '片剂',   'po',    '盒', '处方药', false),
  ('D055', '亚胺培南',   '0.5g/支',   '注射剂', 'ivgtt', '支', '处方药', false),
  ('D056', '阿奇霉素',   '0.25g*6片', '片剂',   'po',    '盒', '处方药', false),
  ('D057', '甲硝唑',     '0.2g*21片', '片剂',   'po',    '盒', '处方药', false),
  ('D058', '万古霉素',   '0.5g/支',   '注射剂', 'ivgtt', '支', '处方药', false)
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO clinical.antibiotic_catalog (drug_id, generic_name, atc_level, pharm_class, ddd, ddd_unit, default_route)
SELECT d.id, d.generic_name, v.atc_level, v.pharm_class, v.ddd, 'g', v.default_route
FROM (VALUES
  ('D017', 'restricted',   'cephalosporin_2',  3.00, 'ivgtt'),
  ('D018', 'unrestricted', 'penicillins',      1.00, 'po'),
  ('D019', 'unrestricted', 'penicillins',     3.60, 'ivgtt'),
  ('D051', 'unrestricted', 'cephalosporin_1',  3.00, 'ivgtt'),
  ('D052', 'restricted',   'cephalosporin_3',  2.00, 'ivgtt'),
  ('D053', 'special',     'cephalosporin_4',  2.00, 'ivgtt'),
  ('D054', 'restricted',   'quinolones',       0.50, 'po'),
  ('D055', 'special',     'carbapenems',      2.00, 'ivgtt'),
  ('D056', 'unrestricted', 'macrolides',       0.30, 'po'),
  ('D057', 'unrestricted', 'nitroimidazole',   1.50, 'po'),
  ('D058', 'special',     'glycopeptides',    2.00, 'ivgtt')
) AS v(drug_code, atc_level, pharm_class, ddd, default_route)
JOIN clinical.drug_catalog d ON d.drug_code = v.drug_code
ON CONFLICT (drug_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 处方授权种子（按职称对应级别）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.ams_prescriber_grants (prescriber_id, max_level, status)
SELECT u.id, v.max_level, 'active'
FROM (VALUES
  ('doctor_res',   'unrestricted'),
  ('doctor_zhou',  'restricted'),
  ('doctor_chen',  'special'),
  ('doctor_li',   'special'),
  ('doctor_lin',   'special')
) AS v(username, max_level)
JOIN iam.users u ON u.username = v.username
ON CONFLICT (prescriber_id) DO NOTHING;
