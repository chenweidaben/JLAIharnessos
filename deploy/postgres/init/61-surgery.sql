-- ============================================================================
-- 健澜科技 jlmedaios · M3-H 手术麻醉管理（三甲核心临床域）
-- 61-surgery.sql
--
-- 业务闭环：手术申请 -> 排班 -> 术前三方核对 -> 麻醉(诱导/维持/苏醒) ->
--   术中事件(用药/输液/输血/体征/危急值) -> PACU(Aldrete>=9 离室) ->
--   术者签名 + 麻醉医师签名双签后 discharged。
--
-- 状态机（clinical.surgery_requests.status）：
--   requested -> scheduled -> prechecked -> induction -> maintenance
--   -> recovery -> pacu -> discharged；任一未终结状态可 -> cancelled。
--   非法转换由应用层 + CHECK 白名单拒绝（409）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- 注释一律全角括号，避免静态校验误判。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.surgery_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no            text NOT NULL UNIQUE,
  visit_id              uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id            uuid NOT NULL REFERENCES clinical.patients(id),
  surgery_type          text NOT NULL DEFAULT 'elective'
                          CHECK (surgery_type IN ('elective','emergency')),
  planned_procedure     text NOT NULL,
  diagnosis             text,
  planned_date          date,
  department            text NOT NULL DEFAULT '外科',
  surgeon_id            uuid REFERENCES iam.users(id),
  anesthetist_id        uuid REFERENCES iam.users(id),
  anesthesia_method     text,
  status                text NOT NULL DEFAULT 'requested'
                          CHECK (status IN ('requested','scheduled','prechecked',
                                 'induction','maintenance','recovery','pacu',
                                 'discharged','cancelled')),
  -- 术前三方核对完整性（患者身份/术式/麻醉方式/术者/抗生素/皮试）
  precheck              jsonb NOT NULL DEFAULT '{}'::jsonb,
  prechecked_at         timestamptz,
  started_at            timestamptz,
  ended_at              timestamptz,
  -- 双签：术者 + 麻醉医师
  surgeon_signed_at     timestamptz,
  anesthetist_signed_at timestamptz,
  cancel_reason         text,
  created_by            uuid REFERENCES iam.users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surgery_status ON clinical.surgery_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_surgery_visit ON clinical.surgery_requests(visit_id);

CREATE TABLE IF NOT EXISTS clinical.anesthesia_records (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_id          uuid NOT NULL UNIQUE REFERENCES clinical.surgery_requests(id) ON DELETE CASCADE,
  induction_notes     text,
  maintenance_notes  text,
  recovery_notes     text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinical.intraop_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_id    uuid NOT NULL REFERENCES clinical.surgery_requests(id) ON DELETE CASCADE,
  event_type    text NOT NULL CHECK (event_type IN
                ('medication','infusion','transfusion','vital','critical')),
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intraop_surgery ON clinical.intraop_events(surgery_id, occurred_at);

CREATE TABLE IF NOT EXISTS clinical.pacu_assessments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_id     uuid NOT NULL REFERENCES clinical.surgery_requests(id) ON DELETE CASCADE,
  aldrete_total  integer NOT NULL CHECK (aldrete_total BETWEEN 0 AND 10),
  assessed_by    uuid REFERENCES iam.users(id),
  can_discharge  boolean NOT NULL DEFAULT false,
  note           text,
  assessed_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pacu_surgery ON clinical.pacu_assessments(surgery_id);

DROP TRIGGER IF EXISTS trg_surgery_updated ON clinical.surgery_requests;
CREATE TRIGGER trg_surgery_updated BEFORE UPDATE ON clinical.surgery_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_anesthesia_updated ON clinical.anesthesia_records;
CREATE TRIGGER trg_anesthesia_updated BEFORE UPDATE ON clinical.anesthesia_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('surgery:view',       '手术麻醉查看', 'surgery', '查看手术申请/排班/麻醉记录/PACU'),
  ('surgery:schedule',   '手术排班',     'surgery', '将手术申请排入手术排程'),
  ('surgery:precheck',   '术前三方核对', 'surgery', '完成术前三方核对并解锁麻醉'),
  ('surgery:anesthesia', '麻醉记录',     'surgery', '记录诱导/维持/苏醒与术中事件'),
  ('surgery:discharge',  '手术离室双签', 'surgery', 'PACU 评分与术者/麻醉双签离室')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code IN ('surgery:view','surgery:schedule','surgery:precheck',
                  'surgery:anesthesia','surgery:discharge')
ON CONFLICT (role_code, permission_code) DO NOTHING;
