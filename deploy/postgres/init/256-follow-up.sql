-- ============================================================================
-- 健澜科技 jlmedaios · M131-A 智能随访（术后/慢病/出院复诊）
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- AI能力深化：基于诊断自动生成术后（1周/1月/3月）、慢病（高血压每月/糖尿病每两周）
-- 与出院复诊（7-14天）随访计划，并驱动提醒触达。

CREATE TABLE IF NOT EXISTS clinical.follow_up_plans (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id       uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id     uuid NOT NULL REFERENCES clinical.patients(id),
  plan_type      text NOT NULL CHECK (plan_type IN
                   ('postop_1w','postop_1m','postop_3m',
                    'chronic_hypertension_monthly',
                    'chronic_diabetes_biweekly',
                    'discharge_revisit')),
  timepoint      text NOT NULL,
  diagnosis      text NOT NULL DEFAULT '',
  due_at         timestamptz NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','sent','completed','cancelled')),
  reminder_sent_at timestamptz,
  completed_at   timestamptz,
  note           text,
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followup_plans_patient ON clinical.follow_up_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_followup_plans_due ON clinical.follow_up_plans(due_at, status);
CREATE INDEX IF NOT EXISTS idx_followup_plans_visit ON clinical.follow_up_plans(visit_id);

-- 随访提醒发送记录
CREATE TABLE IF NOT EXISTS clinical.follow_up_reminders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      uuid NOT NULL REFERENCES clinical.follow_up_plans(id) ON DELETE CASCADE,
  patient_id   uuid NOT NULL REFERENCES clinical.patients(id),
  channel      text NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms','wechat','app','phone')),
  message      text NOT NULL,
  send_at      timestamptz NOT NULL DEFAULT now(),
  status       text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followup_reminders_plan ON clinical.follow_up_reminders(plan_id);

-- 权限
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('follow_up:view',   '智能随访查看', 'follow_up', '查看患者随访计划（doctor/nurse/admin/patient）'),
  ('follow_up:manage', '智能随访管理', 'follow_up', '生成/完成/取消随访计划（doctor/nurse/admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (VALUES
  ('admin','follow_up:view'),
  ('doctor','follow_up:view'),
  ('nurse','follow_up:view'),
  ('patient','follow_up:view'),
  ('admin','follow_up:manage'),
  ('doctor','follow_up:manage'),
  ('nurse','follow_up:manage')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
