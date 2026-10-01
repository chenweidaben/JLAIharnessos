-- ============================================================================
-- 健澜科技 jlmedaios · M3-R 双向转诊服务
-- 72-referral-service.sql
--
-- 医联体/集团医院间双向转诊：转入（incoming）/ 转出（outgoing）。
-- 对标国家医院智慧服务三级基本项目【3 转诊服务】：
--   支持获取患者院外转诊信息并直接存储于医院信息系统，
--   包括 DICOM 影像、病案首页、诊断证明书、检验结果、检查报告。
--
-- 两表：
--  （1）clinical.referral_orders      转诊单（状态机 + 接收后关联就诊）
--  （2）clinical.referral_documents   随附资料（影像/病案/诊断/检验/检查）
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- 注释全角括号，避免朴素括号配平检查误报。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 转诊单号序列（REF + 日期 + 序号，并发安全）
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS clinical.referral_no_seq START 1;

-- ----------------------------------------------------------------------------
-- （1）转诊单
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.referral_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_no     text NOT NULL UNIQUE,                 -- 业务单号（REFyyyymmdd0001）
  direction       text NOT NULL
                    CHECK (direction IN ('incoming','outgoing')),
  patient_id      uuid REFERENCES clinical.patients(id), -- 院内 EMPI（院外未建档可空）
  profile_id      uuid REFERENCES clinical.patient_profiles(id), -- 互联网就诊人
  patient_name    text,                                  -- 患者姓名（院外未建档时冗余）
  gender          text CHECK (gender IN ('男','女','未知','未说明')),
  birth_date      date,
  source_org      text NOT NULL,                         -- 源机构名称
  source_dept     text,                                  -- 源科室
  source_doctor   text,                                  -- 源医生
  target_org      text NOT NULL,                         -- 目标机构名称
  target_dept     text,                                  -- 目标科室
  reason          text NOT NULL,                         -- 转诊原因
  urgency         text NOT NULL DEFAULT 'normal'
                    CHECK (urgency IN ('normal','urgent')),
  status          text NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('draft','submitted','accepted',
                                      'rejected','completed','cancelled')),
  encounter_id    uuid REFERENCES clinical.visits(id),   -- 接收后生成的本院就诊
  accepted_by     uuid REFERENCES iam.users(id),
  accepted_at     timestamptz,
  rejected_reason text,
  created_by      uuid REFERENCES iam.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_patient ON clinical.referral_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_referral_profile ON clinical.referral_orders(profile_id);
CREATE INDEX IF NOT EXISTS idx_referral_status ON clinical.referral_orders(status, direction);
CREATE INDEX IF NOT EXISTS idx_referral_encounter ON clinical.referral_orders(encounter_id);

DROP TRIGGER IF EXISTS trg_referral_updated ON clinical.referral_orders;
CREATE TRIGGER trg_referral_updated BEFORE UPDATE ON clinical.referral_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- （2）随附资料（院外转诊信息，直接存储，可追溯来源）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.referral_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id     uuid NOT NULL REFERENCES clinical.referral_orders(id) ON DELETE CASCADE,
  doc_type        text NOT NULL
                    CHECK (doc_type IN ('dicom','front_page','diagnosis',
                                        'lab','exam','other')),
  title           text NOT NULL,                         -- 资料标题
  content_ref     text,                                  -- 内容引用（study UID / 文件 key）
  content_text    text,                                  -- 文本内容（报告/证明摘要）
  source_org      text,                                  -- 资料来源机构
  received_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referraldoc_referral ON clinical.referral_documents(referral_id);
CREATE INDEX IF NOT EXISTS idx_referraldoc_type ON clinical.referral_documents(doc_type);

-- ----------------------------------------------------------------------------
-- 权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('referral:view',    '转诊查看', 'referral', '查看转诊单与随附资料'),
  ('referral:manage',  '转诊发起', 'referral', '发起转诊、补充随附资料'),
  ('referral:accept',  '转诊接收', 'referral', '接收/拒绝转诊并关联本院就诊')
ON CONFLICT (code) DO NOTHING;

-- 管理端：全部转诊权限
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code IN ('referral:view','referral:manage','referral:accept')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 医生：查看 + 发起 + 接收
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'doctor'
   AND p.code IN ('referral:view','referral:manage','referral:accept')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 护士：仅查看
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'nurse'
   AND p.code IN ('referral:view')
ON CONFLICT (role_code, permission_code) DO NOTHING;
