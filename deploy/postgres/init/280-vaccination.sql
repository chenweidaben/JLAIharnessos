-- ============================================================================
-- 健澜科技 jlmedaios · M142-B 预防接种管理（预防保健与患者服务）
--
-- 以患者为中心的预防接种闭环：
--   clinical.vaccination_record  一人一苗一剂次的接种计划台账（series）：
--     登记时按疫苗类别推导剂次间隔，排好全程接种日期；
--     每接种一针，回写该剂次的接种日期 / 接种护士 / 疫苗批号，
--     并按下一针实际接种日期滚动重算后续应种日期。
--
-- 核心诉求「接种提醒要提前，不能让患者忘了打」：
--   - reminder_lead_days 固定 7 天：到应种日前 7 天即进入提醒窗口；
--   - 超期未种（overdue）单独标记，由患者服务触达渠道（短信/公众号/APP）补位。
--
-- 覆盖五类疫苗：
--   childhood 儿童规划免疫（一类苗）/ flu 成人流感 / covid 新冠 /
--   hpv 人乳头瘤病毒 / hepb 乙肝。
--
-- 权限码：vaccination:view      只读（护士/医生/admin 全员查接种记录与提醒）；
--         vaccination:administer 接种登记与计划排程（护士/admin）。
--
-- 医疗安全红线：
--   - 接种前必须核对患者 / 疫苗 / 批号 / 效期，本台账落批号与接种护士签名；
--   - AI 不自动接种，只做计划排程与到期提醒，实施由接种护士本人完成并签名；
--   - 剂次重复接种由 BFF 纯函数拦截（同剂次已种即抛错）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 接种计划台账（一人一苗一条；剂次进度以 jsonb 落库，便于滚动重算）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.vaccination_record (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          text NOT NULL,
  vaccine_name       text NOT NULL,
  category           text NOT NULL CHECK (category IN ('childhood','flu','covid','hpv','hepb')),
  total_doses        int  NOT NULL CHECK (total_doses >= 1),
  -- 剂次明细：[{doseNo, dueDate, status(pending|done),
  --             administeredAt, nurseId, batchNo}]
  doses              jsonb NOT NULL DEFAULT '[]'::jsonb,
  start_date         date NOT NULL,
  -- 下一针提前多少天提醒（业务红线：固定 7 天）
  reminder_lead_days int  NOT NULL DEFAULT 7,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vaccination_record_patient
  ON clinical.vaccination_record(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vaccination_record_category
  ON clinical.vaccination_record(category);

DROP TRIGGER IF EXISTS trg_vaccination_record_updated ON clinical.vaccination_record;
CREATE TRIGGER trg_vaccination_record_updated BEFORE UPDATE ON clinical.vaccination_record
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('vaccination:view',      '预防接种只读', 'vaccination', '查看患者接种记录、剂次进度与到期提醒（护士/医生/admin）'),
  ('vaccination:administer', '预防接种登记', 'vaccination', '排程接种计划、登记每一针接种信息与批号签名（护士/admin）')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：view 授 nurse/doctor/admin；administer 授 nurse/admin
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'vaccination:view'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='vaccination:view');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'vaccination:administer'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='vaccination:administer');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'vaccination:view'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='vaccination:view');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'vaccination:view'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='vaccination:view');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'vaccination:administer'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='vaccination:administer');
