-- ============================================================================
-- 健澜科技 jlmedaios · M3-I 预约随访闭环
-- 62-appointment-followup.sql
--
-- 预约创建 -> 确认 -> 就诊关联 -> 随访计划 -> 随访记录。
-- 预约状态机：scheduled -> confirmed -> completed / absent；scheduled -> cancelled。
--
-- 三表：
--  （1）clinical.appointments         预约单（appointment_no 唯一，幂等）
--  （2）clinical.follow_up_plans      随访计划（pending/completed/missed）
--  （3）clinical.follow_up_records    随访记录（plan_id 级联删除）
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- 注释全角括号。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.appointments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_no   text NOT NULL UNIQUE,
  patient_id       uuid NOT NULL REFERENCES clinical.patients(id),
  visit_id         uuid REFERENCES clinical.visits(id),
  scheduled_at     timestamptz NOT NULL,
  department       text NOT NULL DEFAULT '门诊',
  purpose          text NOT NULL,
  status           text NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled','confirmed','completed','absent','cancelled')),
  cancel_reason    text,
  created_by       uuid REFERENCES iam.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appt_status ON clinical.appointments(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appt_patient ON clinical.appointments(patient_id);

CREATE TABLE IF NOT EXISTS clinical.follow_up_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_no         text NOT NULL UNIQUE,
  patient_id      uuid NOT NULL REFERENCES clinical.patients(id),
  appointment_id  uuid REFERENCES clinical.appointments(id),
  scheduled_date  date NOT NULL,
  content         text NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','completed','missed')),
  assigned_to     uuid REFERENCES iam.users(id),
  created_by      uuid REFERENCES iam.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuplan_status ON clinical.follow_up_plans(status, scheduled_date);

CREATE TABLE IF NOT EXISTS clinical.follow_up_records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES clinical.follow_up_plans(id) ON DELETE CASCADE,
  outcome     text NOT NULL,
  note        text,
  recorded_by uuid REFERENCES iam.users(id),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_furecord_plan ON clinical.follow_up_records(plan_id);

DROP TRIGGER IF EXISTS trg_appt_updated ON clinical.appointments;
CREATE TRIGGER trg_appt_updated BEFORE UPDATE ON clinical.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_fuplan_updated ON clinical.follow_up_plans;
CREATE TRIGGER trg_fuplan_updated BEFORE UPDATE ON clinical.follow_up_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('appt:view',     '预约随访查看', 'outpatient', '查看预约与随访计划/记录'),
  ('appt:confirm',  '预约确认',     'outpatient', '确认预约并关联就诊'),
  ('appt:followup', '随访执行',     'outpatient', '记录随访结果并完成随访计划')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE (r.code = 'admin' OR r.code = 'doctor')
   AND p.code IN ('appt:view','appt:confirm','appt:followup')
ON CONFLICT (role_code, permission_code) DO NOTHING;
