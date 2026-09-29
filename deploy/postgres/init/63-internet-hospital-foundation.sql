-- ============================================================================
-- 健澜科技 jlmedaios · M3-J 互联网医院基座
-- 63-internet-hospital-foundation.sql
--
-- 患者账号 -> 就诊人 -> 实名认证 -> EMPI 绑定；医护线上资质审核。
-- 对标国家医院智慧服务三级的基础与安全项（安全管理、服务监督）。
--
-- 四表：
--  （1）clinical.patient_accounts        互联网患者账号（微信 openid/unionid）
--  （2）clinical.patient_profiles        就诊人（账号下多人，绑定 EMPI）
--  （3）clinical.realname_verifications  实名认证记录（可追溯）
--  （4）iam.internet_practitioners       医护线上执业资质（审核）
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- 注释全角括号，避免朴素括号配平检查误报。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 互联网患者序号（EMPI 新患者 MRN 派生，并发安全；与住院/急诊序号独立）
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS clinical.internet_patient_no_seq START 1;

-- ----------------------------------------------------------------------------
-- （1）互联网患者账号
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.patient_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  openid          text UNIQUE,                          -- 微信 openid（可空，支持手机号注册）
  unionid         text,                                 -- 微信 unionid（多应用打通）
  channel         text NOT NULL DEFAULT 'wechat'
                    CHECK (channel IN ('wechat','alipay','h5','app')),
  phone_enc       text,                                 -- 手机号（AES-GCM 加密）
  phone_hash      text,                                 -- 手机号哈希（用于查找/去重）
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','disabled','logged_out')),
  last_login_at   timestamptz,
  last_login_ip   inet,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pacct_unionid ON clinical.patient_accounts(unionid);
CREATE INDEX IF NOT EXISTS idx_pacct_phone_hash ON clinical.patient_accounts(phone_hash);

DROP TRIGGER IF EXISTS trg_pacct_updated ON clinical.patient_accounts;
CREATE TRIGGER trg_pacct_updated BEFORE UPDATE ON clinical.patient_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- （2）就诊人（一个账号可绑定本人/家人，最多 5 人由应用层校验）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.patient_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES clinical.patient_accounts(id) ON DELETE CASCADE,
  patient_id      uuid REFERENCES clinical.patients(id), -- 绑定院内 EMPI（实名后回填）
  relation        text NOT NULL DEFAULT 'self'
                    CHECK (relation IN ('self','parent','child','spouse','other')),
  name_enc        text,                                 -- 真实姓名（AES-GCM 加密）
  name_masked     text,                                 -- 脱敏姓名（如 张*三）
  id_card_enc     text,                                 -- 身份证号（AES-GCM 加密）
  id_card_hash    text,                                 -- 身份证号 SHA-256 哈希（不存明文）
  gender          text CHECK (gender IN ('男','女','未知','未说明')),
  birth_date      date,
  auth_level      smallint NOT NULL DEFAULT 1 CHECK (auth_level BETWEEN 1 AND 3),
  guardian_id     uuid REFERENCES clinical.patient_profiles(id), -- 未成年人/无表达能力者监护人
  is_default      boolean NOT NULL DEFAULT false,
  verified_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pprofile_account ON clinical.patient_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_pprofile_patient ON clinical.patient_profiles(patient_id);
CREATE INDEX IF NOT EXISTS idx_pprofile_idcard_hash
  ON clinical.patient_profiles(id_card_hash) WHERE id_card_hash IS NOT NULL;
-- 同一身份证允许跨账号重复（家人代付/配偶等），但同一账号内不得重复添加
CREATE UNIQUE INDEX IF NOT EXISTS idx_pprofile_acct_idcard
  ON clinical.patient_profiles(account_id, id_card_hash) WHERE id_card_hash IS NOT NULL;

DROP TRIGGER IF EXISTS trg_pprofile_updated ON clinical.patient_profiles;
CREATE TRIGGER trg_pprofile_updated BEFORE UPDATE ON clinical.patient_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- （3）实名认证记录（每次认证留痕，可追溯，不含原始生物特征）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.realname_verifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES clinical.patient_profiles(id) ON DELETE CASCADE,
  verify_type     text NOT NULL
                    CHECK (verify_type IN ('id_card','face','bank','operator','health_card','insurance')),
  provider        text NOT NULL,                        -- 认证提供方（如 tencent/aliyun/local-demo）
  status          text NOT NULL CHECK (status IN ('pending','passed','failed')),
  reason          text,                                 -- 失败原因/备注
  trace_id        text,                                 -- 链路追踪 ID
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_realname_profile ON clinical.realname_verifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_realname_status ON clinical.realname_verifications(status, created_at);

-- ----------------------------------------------------------------------------
-- （4）医护线上执业资质（互联网医院从业者，须审核后开通线上服务）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS iam.internet_practitioners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
  practitioner_no text,                                 -- 执业医师/药师证书编号
  practitioner_type text NOT NULL DEFAULT 'doctor'
                    CHECK (practitioner_type IN ('doctor','pharmacist','nurse')),
  practice_scope  text,                                 -- 执业范围/科室
  practice_years  int CHECK (practice_years >= 0),
  audit_status    text NOT NULL DEFAULT 'pending'
                    CHECK (audit_status IN ('pending','approved','rejected')),
  audit_reason    text,
  approved_at     timestamptz,
  approved_by     uuid REFERENCES iam.users(id),
  valid_from      date,
  valid_to        date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inetpract_user
  ON iam.internet_practitioners(user_id);
CREATE INDEX IF NOT EXISTS idx_inetpract_status ON iam.internet_practitioners(audit_status);

DROP TRIGGER IF EXISTS trg_inetpract_updated ON iam.internet_practitioners;
CREATE TRIGGER trg_inetpract_updated BEFORE UPDATE ON iam.internet_practitioners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('patient:account',          '患者账号管理', 'internet-hospital', '患者账号/就诊人注册与维护'),
  ('patient:realname',         '实名认证',     'internet-hospital', '发起并查看实名认证'),
  ('internet:practitioner',    '线上资质查看', 'internet-hospital', '查看互联网医护资质'),
  ('internet:practitioner:audit','线上资质审核','internet-hospital', '审核医护线上执业资质')
ON CONFLICT (code) DO NOTHING;

-- 管理端：资质审核与查看授权给 admin
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code IN ('patient:account','patient:realname',
                  'internet:practitioner','internet:practitioner:audit')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 医生/药师：可查看本人线上资质（不含审核权）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code IN ('doctor','pharmacist')
   AND p.code IN ('internet:practitioner')
ON CONFLICT (role_code, permission_code) DO NOTHING;
