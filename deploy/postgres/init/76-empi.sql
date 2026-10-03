-- ============================================================================
-- 健澜科技杠OS - 患者主索引 EMPI：标识登记、匹配候选与逻辑链接
-- 76-empi.sql
--
-- 面向 M5「数据中台 / 主数据治理 MDM」：
--  - patient_identifiers：患者跨标识域登记（身份证、医保、手机、微信、外部机构），
--    标识值以哈希存储，仅留末四位用于人工核对；
--  - empi_match_candidates：匹配引擎生成的疑似重复患者对，不自动合并，人工审核；
--  - empi_links：审核确认同一人后建立的逻辑主从链接（不物理合并、不迁移外键）。
--
-- 红线：匹配确定性、可复现；物理合并需另立高风险迁移，本切片不做；
--  标识哈希存储，不写明文。
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

-- 患者标识登记
CREATE TABLE IF NOT EXISTS clinical.patient_identifiers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  identifier_domain text NOT NULL
                     CHECK (identifier_domain IN
                       ('mrn','id_card','insurance','phone','wechat','outer')),
  identifier_hash  text NOT NULL,
  identifier_last4 text,
  source           text NOT NULL DEFAULT 'local',
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identifier_domain, identifier_hash)
);
CREATE INDEX IF NOT EXISTS idx_patient_identifiers_patient
  ON clinical.patient_identifiers(patient_id);

-- 匹配候选（疑似重复患者对）
CREATE TABLE IF NOT EXISTS clinical.empi_match_candidates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_a_id  uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  patient_b_id  uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  match_score   integer NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','rejected')),
  reviewed_by   uuid REFERENCES iam.users(id),
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_a_id, patient_b_id)
);
CREATE INDEX IF NOT EXISTS idx_empi_candidates_status
  ON clinical.empi_match_candidates(status) WHERE status = 'pending';

-- 患者逻辑链接（确认同一人；linked 患者指向 master，不物理合并）
CREATE TABLE IF NOT EXISTS clinical.empi_links (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  linked_patient_id uuid NOT NULL UNIQUE REFERENCES clinical.patients(id) ON DELETE CASCADE,
  candidate_id     uuid REFERENCES clinical.empi_match_candidates(id),
  created_by       uuid REFERENCES iam.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (master_patient_id <> linked_patient_id)
);
CREATE INDEX IF NOT EXISTS idx_empi_links_master
  ON clinical.empi_links(master_patient_id);

-- ----------------------------------------------------------------------------
-- 权限码
--    empi:read  标识、候选、链接查看
--    empi:write 标识登记、触发匹配、审核确认/拒绝、建立链接
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('empi:read',  '患者主索引查看', 'empi', 'EMPI 标识、匹配候选与患者链接查看'),
  ('empi:write', '患者主索引管理', 'empi', '标识登记、匹配扫描、候选审核与建立链接')
ON CONFLICT (code) DO NOTHING;

-- 授予角色：admin 全权；doctor 仅查看（链接确认属主数据管理员职责，不授予）；
-- 其余角色不授予，越权 403
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'empi:read'),
  ('admin', 'empi:write'),
  ('doctor', 'empi:read')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;
