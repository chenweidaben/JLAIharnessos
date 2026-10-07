-- ============================================================================
-- 健澜科技 jlmedaios · M11-B 检查全流程（RIS/PACS）
--
--  在现有 clinical.imaging_reports 之上补齐放射信息系统全流程闭环：
--   - 检查项目目录 imaging_exams / 检查设备 imaging_devices / 设备时段 imaging_device_slots；
--   - 检查申请单 imaging_requests 与申请项目行 imaging_request_items；
--   - 预约安排 imaging_appointments（到检/执行/取消/约满）；
--   - 检查执行 imaging_studies（DICOM Study，登记图像引用）；
--   - 扩展 clinical.imaging_reports：报告状态/签名/关联列，使报告与申请、
--     预约、study 串联，并复用既有影像危急值通道；
--   - 种子三名放射账号（rad_tech / rad_doc / rad_doc2）支撑书写与审核职责分离；
--   - 种子目录：CT/MR/DR/US 四台设备与六个检查项目，并按今天起连续三天排班；
--   - 权限码 ris:catalog / ris:request / ris:schedule / ris:perform / ris:report /
--     ris:review / ris:publish，并按 admin / doctor / technician 授权。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / ON CONFLICT DO NOTHING，
--       触发器先 DROP TRIGGER IF EXISTS 再建，可重复执行。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 一、检查项目目录
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.imaging_exams (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_code         text NOT NULL UNIQUE,
  name              text NOT NULL,
  modality          text NOT NULL CHECK (modality IN ('CR','DX','CT','MR','US','XA','PT','NM','MG')),
  body_part         text,
  exec_department   text NOT NULL DEFAULT '放射科',
  default_device_id uuid,
  price             numeric(10,2) NOT NULL DEFAULT 0,
  needs_scheduling  boolean NOT NULL DEFAULT true,
  duration_minutes  int NOT NULL DEFAULT 15,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_imaging_exams_updated ON clinical.imaging_exams;
CREATE TRIGGER trg_imaging_exams_updated BEFORE UPDATE ON clinical.imaging_exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 二、检查设备
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.imaging_devices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code text NOT NULL UNIQUE,
  name        text NOT NULL,
  modality    text NOT NULL CHECK (modality IN ('CR','DX','CT','MR','US','XA','PT','NM','MG')),
  room        text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_imaging_devices_updated ON clinical.imaging_devices;
CREATE TRIGGER trg_imaging_devices_updated BEFORE UPDATE ON clinical.imaging_devices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 三、设备时段排班
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.imaging_device_slots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id    uuid NOT NULL REFERENCES clinical.imaging_devices(id),
  slot_date    date NOT NULL,
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  capacity     int NOT NULL DEFAULT 1 CHECK (capacity >= 0),
  booked_count int NOT NULL DEFAULT 0 CHECK (booked_count >= 0 AND booked_count <= capacity),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id, slot_date, start_time)
);
CREATE INDEX IF NOT EXISTS idx_imgslot_device_date ON clinical.imaging_device_slots(device_id, slot_date);

-- ----------------------------------------------------------------------------
-- 四、检查申请单
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.imaging_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no    text NOT NULL UNIQUE,
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id    uuid NOT NULL REFERENCES clinical.patients(id),
  ordered_by    uuid REFERENCES iam.users(id),
  urgency       text NOT NULL DEFAULT 'routine'
                CHECK (urgency IN ('routine','urgent','stat')),
  diagnosis     text,
  chief_complaint text,
  status        text NOT NULL DEFAULT 'requested'
                CHECK (status IN ('requested','scheduled','arrived','in_progress','completed','cancelled')),
  cancelled_by  uuid,
  cancelled_at  timestamptz,
  cancel_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_imgreq_visit ON clinical.imaging_requests(visit_id);
CREATE INDEX IF NOT EXISTS idx_imgreq_patient ON clinical.imaging_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_imgreq_status ON clinical.imaging_requests(status);
CREATE INDEX IF NOT EXISTS idx_imgreq_ordered ON clinical.imaging_requests(ordered_by);
DROP TRIGGER IF EXISTS trg_imaging_requests_updated ON clinical.imaging_requests;
CREATE TRIGGER trg_imaging_requests_updated BEFORE UPDATE ON clinical.imaging_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 五、申请项目行
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.imaging_request_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES clinical.imaging_requests(id) ON DELETE CASCADE,
  exam_id    uuid NOT NULL REFERENCES clinical.imaging_exams(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, exam_id)
);
CREATE INDEX IF NOT EXISTS idx_imgreqitem_request ON clinical.imaging_request_items(request_id);

-- ----------------------------------------------------------------------------
-- 六、预约安排
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.imaging_appointments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_no text NOT NULL UNIQUE,
  request_id     uuid NOT NULL REFERENCES clinical.imaging_requests(id),
  exam_id        uuid NOT NULL REFERENCES clinical.imaging_exams(id),
  slot_id        uuid NOT NULL REFERENCES clinical.imaging_device_slots(id),
  device_id      uuid NOT NULL REFERENCES clinical.imaging_devices(id),
  scheduled_start timestamptz NOT NULL,
  status         text NOT NULL DEFAULT 'booked'
                 CHECK (status IN ('booked','arrived','done','cancelled','no_show')),
  checked_in_at  timestamptz,
  created_by     uuid REFERENCES iam.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_imgappt_request ON clinical.imaging_appointments(request_id);
CREATE INDEX IF NOT EXISTS idx_imgappt_exam ON clinical.imaging_appointments(exam_id);
CREATE INDEX IF NOT EXISTS idx_imgappt_slot ON clinical.imaging_appointments(slot_id);
CREATE INDEX IF NOT EXISTS idx_imgappt_status ON clinical.imaging_appointments(status);
DROP TRIGGER IF EXISTS trg_imaging_appointments_updated ON clinical.imaging_appointments;
CREATE TRIGGER trg_imaging_appointments_updated BEFORE UPDATE ON clinical.imaging_appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 七、检查执行 / DICOM Study
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.imaging_studies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_uid    text NOT NULL UNIQUE,
  appointment_id uuid NOT NULL REFERENCES clinical.imaging_appointments(id),
  request_id   uuid NOT NULL REFERENCES clinical.imaging_requests(id),
  exam_id      uuid NOT NULL REFERENCES clinical.imaging_exams(id),
  device_id    uuid NOT NULL REFERENCES clinical.imaging_devices(id),
  modality     text NOT NULL CHECK (modality IN ('CR','DX','CT','MR','US','XA','PT','NM','MG')),
  status       text NOT NULL DEFAULT 'performed' CHECK (status IN ('performed')),
  performed_by uuid NOT NULL REFERENCES iam.users(id),
  performed_at timestamptz NOT NULL DEFAULT now(),
  image_refs   jsonb NOT NULL DEFAULT '[]',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_imgstudy_appt ON clinical.imaging_studies(appointment_id);
CREATE INDEX IF NOT EXISTS idx_imgstudy_request ON clinical.imaging_studies(request_id);
CREATE INDEX IF NOT EXISTS idx_imgstudy_exam ON clinical.imaging_studies(exam_id);
CREATE INDEX IF NOT EXISTS idx_imgstudy_device ON clinical.imaging_studies(device_id);
DROP TRIGGER IF EXISTS trg_imaging_studies_updated ON clinical.imaging_studies;
CREATE TRIGGER trg_imaging_studies_updated BEFORE UPDATE ON clinical.imaging_studies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 八、扩展既有 clinical.imaging_reports：报告状态/签名/关联列
--    现有列保留（id/visit_id/patient_id/study_uid/modality/exam_name/body_part/
--    findings/impression/ai_findings/is_critical/report_time/image_refs/created_at）。
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.imaging_reports ADD COLUMN IF NOT EXISTS report_no text;
ALTER TABLE clinical.imaging_reports ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft','reviewing','approved','published','returned'));
ALTER TABLE clinical.imaging_reports ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES clinical.imaging_requests(id);
ALTER TABLE clinical.imaging_reports ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES clinical.imaging_appointments(id);
ALTER TABLE clinical.imaging_reports ADD COLUMN IF NOT EXISTS study_id uuid REFERENCES clinical.imaging_studies(id);
ALTER TABLE clinical.imaging_reports ADD COLUMN IF NOT EXISTS exam_id uuid REFERENCES clinical.imaging_exams(id);
ALTER TABLE clinical.imaging_reports ADD COLUMN IF NOT EXISTS written_by uuid REFERENCES iam.users(id);
ALTER TABLE clinical.imaging_reports ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE clinical.imaging_reports ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES iam.users(id);
ALTER TABLE clinical.imaging_reports ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE clinical.imaging_reports ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES iam.users(id);
ALTER TABLE clinical.imaging_reports ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE clinical.imaging_reports ADD COLUMN IF NOT EXISTS returned_by uuid REFERENCES iam.users(id);
ALTER TABLE clinical.imaging_reports ADD COLUMN IF NOT EXISTS returned_at timestamptz;
ALTER TABLE clinical.imaging_reports ADD COLUMN IF NOT EXISTS return_reason text;

-- report_no 唯一索引：历史空值允许多个 NULL（PG 唯一索引不约束 NULL）
CREATE UNIQUE INDEX IF NOT EXISTS uq_imaging_reports_report_no ON clinical.imaging_reports(report_no);
CREATE INDEX IF NOT EXISTS idx_ir_request ON clinical.imaging_reports(request_id);
CREATE INDEX IF NOT EXISTS idx_ir_status ON clinical.imaging_reports(status);
CREATE INDEX IF NOT EXISTS idx_ir_study ON clinical.imaging_reports(study_id);

-- ----------------------------------------------------------------------------
-- 九、种子账号：三名放射人员，支撑报告书写与审核职责分离
-- ----------------------------------------------------------------------------
INSERT INTO iam.users (username, name, employee_no, department, title, role, status)
VALUES ('rad_tech', '放射科技师', 'RAD3001', '放射科', '主管技师', 'technician', 'active')
ON CONFLICT (username) DO UPDATE
  SET name = EXCLUDED.name,
      employee_no = EXCLUDED.employee_no,
      department = EXCLUDED.department,
      title = EXCLUDED.title,
      role = EXCLUDED.role,
      status = 'active',
      deleted_at = NULL;

INSERT INTO iam.users (username, name, employee_no, department, title, role, status)
VALUES ('rad_doc', '放射报告医师', 'RAD3002', '放射科', '主治医师', 'technician', 'active')
ON CONFLICT (username) DO UPDATE
  SET name = EXCLUDED.name,
      employee_no = EXCLUDED.employee_no,
      department = EXCLUDED.department,
      title = EXCLUDED.title,
      role = EXCLUDED.role,
      status = 'active',
      deleted_at = NULL;

INSERT INTO iam.users (username, name, employee_no, department, title, role, status)
VALUES ('rad_doc2', '放射审核医师', 'RAD3003', '放射科', '主任医师', 'technician', 'active')
ON CONFLICT (username) DO UPDATE
  SET name = EXCLUDED.name,
      employee_no = EXCLUDED.employee_no,
      department = EXCLUDED.department,
      title = EXCLUDED.title,
      role = EXCLUDED.role,
      status = 'active',
      deleted_at = NULL;

INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'technician', 'department', '放射科'
FROM iam.users u
WHERE u.username = 'rad_tech'
ON CONFLICT (user_id, role_code) DO UPDATE
  SET data_scope = 'department', scope_value = '放射科';

INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'technician', 'department', '放射科'
FROM iam.users u
WHERE u.username = 'rad_doc'
ON CONFLICT (user_id, role_code) DO UPDATE
  SET data_scope = 'department', scope_value = '放射科';

INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'technician', 'department', '放射科'
FROM iam.users u
WHERE u.username = 'rad_doc2'
ON CONFLICT (user_id, role_code) DO UPDATE
  SET data_scope = 'department', scope_value = '放射科';

-- ----------------------------------------------------------------------------
-- 十、种子目录：设备与检查项目
-- ----------------------------------------------------------------------------
INSERT INTO clinical.imaging_devices (device_code, name, modality, room) VALUES
  ('CT1',  '1号CT机',    'CT', '1号CT室'),
  ('MR1',  '1号MR机',    'MR', '1号MR室'),
  ('DR1',  '1号DR机',    'DX', 'DR1室'),
  ('US1',  '1号超声机',  'US', '超声1室')
ON CONFLICT (device_code) DO NOTHING;

INSERT INTO clinical.imaging_exams
  (exam_code, name, modality, body_part, needs_scheduling, duration_minutes, price) VALUES
  ('CT_HEAD',     '头颅CT平扫',   'CT', '头颅', true,  10, 180.00),
  ('CT_CHEST',    '胸部CT平扫',   'CT', '胸部', true,  10, 200.00),
  ('MR_LUMBAR',   '腰椎MRI平扫', 'MR', '腰椎', true,  20, 480.00),
  ('DR_CHEST',    '胸部正位DR',   'DX', '胸部', true,   5,  60.00),
  ('DR_ABDOMEN',  '腹部立位DR',   'DX', '腹部', true,   5,  60.00),
  ('US_ABDOMEN',  '腹部超声',     'US', '腹部', true,  15, 120.00)
ON CONFLICT (exam_code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 十一、种子时段：每台设备今天起连续三天，上午三段 + 下午两段，容量 2
-- ----------------------------------------------------------------------------
INSERT INTO clinical.imaging_device_slots (device_id, slot_date, start_time, end_time, capacity)
SELECT d.id, dates.d::date, t.start_time, t.end_time, 2
FROM clinical.imaging_devices d
CROSS JOIN generate_series(current_date, current_date + 2, interval '1 day') AS dates(d)
CROSS JOIN (VALUES
  ('09:00'::time, '09:30'::time),
  ('09:30'::time, '10:00'::time),
  ('10:00'::time, '10:30'::time),
  ('14:00'::time, '14:30'::time),
  ('14:30'::time, '15:00'::time)
) AS t(start_time, end_time)
ON CONFLICT (device_id, slot_date, start_time) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 十二、权限码与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('ris:catalog',   'RIS 目录维护',   'imaging', '检查项目/设备/时段目录维护'),
  ('ris:request',   'RIS 检查申请',   'imaging', '开立检查申请单'),
  ('ris:schedule',  'RIS 预约到检',   'imaging', '预约安排与到检登记'),
  ('ris:perform',   'RIS 检查执行',   'imaging', '技师执行检查并生成 study'),
  ('ris:report',    'RIS 报告书写',   'imaging', '书写报告（含 AI 辅助）'),
  ('ris:review',    'RIS 报告审核',   'imaging', '报告审核/退回（职责分离）'),
  ('ris:publish',   'RIS 报告发布',   'imaging', '报告发布与电子签名')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT v.role_code, v.permission_code
FROM (VALUES
  ('admin',      'ris:catalog'),
  ('admin',      'ris:request'),
  ('admin',      'ris:schedule'),
  ('admin',      'ris:perform'),
  ('admin',      'ris:report'),
  ('admin',      'ris:review'),
  ('admin',      'ris:publish'),
  ('doctor',     'ris:request'),
  ('technician', 'ris:schedule'),
  ('technician', 'ris:perform'),
  ('technician', 'ris:report'),
  ('technician', 'ris:review'),
  ('technician', 'ris:publish')
) AS v(role_code, permission_code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.role_code = v.role_code AND rp.permission_code = v.permission_code
);
