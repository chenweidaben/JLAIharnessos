-- ============================================================================
-- 健澜科技 jlmedaios · M11-A 检验全流程（LIS）
--
--  在现有 clinical.lab_results 之上补齐检验信息系统全流程闭环：
--   - 检验面板目录 lab_panels / 检验项目目录 lab_items / 面板-项目映射 lab_panel_items；
--   - 检验申请单 lab_requests 与申请项目行 lab_request_items；
--   - 标本 lab_specimens（采集/签收/拒收/上机）；
--   - 检验报告 lab_reports（草稿/审核/批准/发布/退回）；
--   - 扩展 clinical.lab_results：request_id / specimen_id / report_id / entered_by，
--     使结果行与申请、标本、报告串联，并复用既有危急值闭环 scanAndRaise；
--   - 种子两名检验技师（tech_lab / tech_lab2）支撑录入与审核职责分离；
--   - 种子目录：血常规 CBC / 生化全套 BIO / 凝血功能 COAG 面板及 13 个项目；
--   - 权限码 lis:catalog / lis:request / lis:collect / lis:receive / lis:enter /
--     lis:review / lis:publish，并按 admin / doctor / nurse / technician 授权。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / ON CONFLICT DO NOTHING，
--       触发器先 DROP TRIGGER IF EXISTS 再建，可重复执行。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 检验面板目录
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.lab_panels (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE,
  name           text NOT NULL,
  specimen_type  text,
  exec_department text NOT NULL DEFAULT '检验科',
  price          numeric(10,2) NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_lab_panels_updated ON clinical.lab_panels;
CREATE TRIGGER trg_lab_panels_updated BEFORE UPDATE ON clinical.lab_panels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 检验项目目录
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.lab_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE,
  name           text NOT NULL,
  specimen_type  text,
  unit           text,
  ref_low        numeric(14,4),
  ref_high       numeric(14,4),
  crit_low       numeric(14,4),
  crit_high      numeric(14,4),
  exec_department text NOT NULL DEFAULT '检验科',
  price          numeric(10,2) NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_lab_items_updated ON clinical.lab_items;
CREATE TRIGGER trg_lab_items_updated BEFORE UPDATE ON clinical.lab_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 面板-项目映射
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.lab_panel_items (
  panel_id     uuid NOT NULL REFERENCES clinical.lab_panels(id) ON DELETE CASCADE,
  item_id      uuid NOT NULL REFERENCES clinical.lab_items(id) ON DELETE CASCADE,
  display_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (panel_id, item_id)
);

-- ----------------------------------------------------------------------------
-- 检验申请单
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.lab_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no   text NOT NULL UNIQUE,
  visit_id     uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id   uuid NOT NULL REFERENCES clinical.patients(id),
  ordered_by   uuid REFERENCES iam.users(id),
  urgency      text NOT NULL DEFAULT 'routine'
               CHECK (urgency IN ('routine','urgent','stat')),
  diagnosis    text,
  note         text,
  status       text NOT NULL DEFAULT 'requested'
               CHECK (status IN ('requested','accepted','specimen_collected','in_progress','completed','cancelled')),
  cancelled_by uuid,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_labreq_visit ON clinical.lab_requests(visit_id);
CREATE INDEX IF NOT EXISTS idx_labreq_patient ON clinical.lab_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_labreq_status ON clinical.lab_requests(status);
CREATE INDEX IF NOT EXISTS idx_labreq_ordered ON clinical.lab_requests(ordered_by);
DROP TRIGGER IF EXISTS trg_lab_requests_updated ON clinical.lab_requests;
CREATE TRIGGER trg_lab_requests_updated BEFORE UPDATE ON clinical.lab_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 申请项目行：面板级或单项目级申请，至少指定其一
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.lab_request_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES clinical.lab_requests(id) ON DELETE CASCADE,
  panel_id   uuid REFERENCES clinical.lab_panels(id),
  item_id    uuid REFERENCES clinical.lab_items(id),
  CHECK (panel_id IS NOT NULL OR item_id IS NOT NULL),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_labreqitem_request ON clinical.lab_request_items(request_id);

-- ----------------------------------------------------------------------------
-- 标本：一面板一标本，按申请展开生成条码
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.lab_specimens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specimen_no   text NOT NULL UNIQUE,
  request_id    uuid NOT NULL REFERENCES clinical.lab_requests(id) ON DELETE CASCADE,
  visit_id      uuid NOT NULL,
  patient_id    uuid NOT NULL,
  panel_id      uuid REFERENCES clinical.lab_panels(id),
  specimen_type text NOT NULL,
  status        text NOT NULL DEFAULT 'registered'
                CHECK (status IN ('registered','collected','received','rejected','tested')),
  collected_by  uuid REFERENCES iam.users(id),
  collected_at  timestamptz,
  collection_site text,
  received_by   uuid REFERENCES iam.users(id),
  received_at   timestamptz,
  rejected_by   uuid REFERENCES iam.users(id),
  rejected_at   timestamptz,
  reject_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_labspec_request ON clinical.lab_specimens(request_id);
CREATE INDEX IF NOT EXISTS idx_labspec_visit ON clinical.lab_specimens(visit_id);
CREATE INDEX IF NOT EXISTS idx_labspec_patient ON clinical.lab_specimens(patient_id);
CREATE INDEX IF NOT EXISTS idx_labspec_status ON clinical.lab_specimens(status);
CREATE INDEX IF NOT EXISTS idx_labspec_panel ON clinical.lab_specimens(panel_id);
DROP TRIGGER IF EXISTS trg_lab_specimens_updated ON clinical.lab_specimens;
CREATE TRIGGER trg_lab_specimens_updated BEFORE UPDATE ON clinical.lab_specimens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 检验报告：申请单一面板一份，须资质人员审核后方可发布
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.lab_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_no    text NOT NULL UNIQUE,
  request_id   uuid NOT NULL REFERENCES clinical.lab_requests(id) ON DELETE CASCADE,
  visit_id     uuid NOT NULL,
  patient_id   uuid NOT NULL,
  specimen_id  uuid REFERENCES clinical.lab_specimens(id),
  panel_id     uuid REFERENCES clinical.lab_panels(id),
  panel_name   text,
  status       text NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','reviewing','approved','published','returned')),
  entered_by   uuid REFERENCES iam.users(id),
  reviewed_by  uuid REFERENCES iam.users(id),
  reviewed_at  timestamptz,
  published_by uuid REFERENCES iam.users(id),
  published_at timestamptz,
  returned_by  uuid REFERENCES iam.users(id),
  returned_at  timestamptz,
  return_reason text,
  report_time  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, panel_id)
);
CREATE INDEX IF NOT EXISTS idx_labrep_visit ON clinical.lab_reports(visit_id);
CREATE INDEX IF NOT EXISTS idx_labrep_patient ON clinical.lab_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_labrep_status ON clinical.lab_reports(status);
CREATE INDEX IF NOT EXISTS idx_labrep_entered ON clinical.lab_reports(entered_by);
DROP TRIGGER IF EXISTS trg_lab_reports_updated ON clinical.lab_reports;
CREATE TRIGGER trg_lab_reports_updated BEFORE UPDATE ON clinical.lab_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 扩展既有 clinical.lab_results，串联申请/标本/报告/录入人
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.lab_results ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES clinical.lab_requests(id);
ALTER TABLE clinical.lab_results ADD COLUMN IF NOT EXISTS specimen_id uuid REFERENCES clinical.lab_specimens(id);
ALTER TABLE clinical.lab_results ADD COLUMN IF NOT EXISTS report_id uuid REFERENCES clinical.lab_reports(id) ON DELETE CASCADE;
ALTER TABLE clinical.lab_results ADD COLUMN IF NOT EXISTS entered_by uuid REFERENCES iam.users(id);
CREATE INDEX IF NOT EXISTS idx_lab_report_id ON clinical.lab_results(report_id);
CREATE INDEX IF NOT EXISTS idx_lab_specimen_id ON clinical.lab_results(specimen_id);
CREATE INDEX IF NOT EXISTS idx_lab_request_id ON clinical.lab_results(request_id);

-- ----------------------------------------------------------------------------
-- 种子账号：两名检验技师，支撑录入与审核职责分离
-- ----------------------------------------------------------------------------
INSERT INTO iam.users (username, name, employee_no, department, title, role, status)
VALUES ('tech_lab', '检验技师', 'LAB3001', '检验科', '主管技师', 'technician', 'active')
ON CONFLICT (username) DO UPDATE
  SET name = EXCLUDED.name,
      employee_no = EXCLUDED.employee_no,
      department = EXCLUDED.department,
      title = EXCLUDED.title,
      role = EXCLUDED.role,
      status = 'active',
      deleted_at = NULL;

INSERT INTO iam.users (username, name, employee_no, department, title, role, status)
VALUES ('tech_lab2', '复核技师', 'LAB3002', '检验科', '副主任技师', 'technician', 'active')
ON CONFLICT (username) DO UPDATE
  SET name = EXCLUDED.name,
      employee_no = EXCLUDED.employee_no,
      department = EXCLUDED.department,
      title = EXCLUDED.title,
      role = EXCLUDED.role,
      status = 'active',
      deleted_at = NULL;

INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'technician', 'department', '检验科'
FROM iam.users u
WHERE u.username = 'tech_lab'
ON CONFLICT (user_id, role_code) DO UPDATE
  SET data_scope = 'department', scope_value = '检验科';

INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'technician', 'department', '检验科'
FROM iam.users u
WHERE u.username = 'tech_lab2'
ON CONFLICT (user_id, role_code) DO UPDATE
  SET data_scope = 'department', scope_value = '检验科';

-- ----------------------------------------------------------------------------
-- 种子目录：面板与项目
-- ----------------------------------------------------------------------------
INSERT INTO clinical.lab_panels (code, name, specimen_type) VALUES
  ('CBC',  '血常规', 'EDTA抗凝血'),
  ('BIO',  '生化全套', '血清'),
  ('COAG', '凝血功能', '枸橼酸钠抗凝血')
ON CONFLICT (code) DO NOTHING;

INSERT INTO clinical.lab_items (code, name, unit, ref_low, ref_high, crit_low, crit_high) VALUES
  ('HGB',  '血红蛋白',           'g/L',          115,   150,   50,    NULL),
  ('WBC',  '白细胞',             '×10^9/L',      4,     10,    1.0,   100),
  ('PLT',  '血小板',             '×10^9/L',      100,   300,   30,    NULL),
  ('K',    '血钾',               'mmol/L',       3.5,   5.3,   2.8,   6.5),
  ('NA',   '血钠',               'mmol/L',       137,   147,   120,   160),
  ('GLU',  '血糖',               'mmol/L',       3.9,   6.1,   2.2,   22.2),
  ('ALT',  '丙氨酸氨基转移酶',   'U/L',          9,     50,    NULL,  NULL),
  ('TBIL', '总胆红素',           'μmol/L',       3.4,   20.1,  NULL,  NULL),
  ('CR',   '肌酐',               'μmol/L',       57,    111,   NULL,  NULL),
  ('cTnI', '肌钙蛋白',           'ng/mL',        0,     0.04,  NULL,  0.5),
  ('PT',   '凝血酶原时间',       's',            11,    14,    NULL,  NULL),
  ('INR',  '国际标准化比值',     NULL,           0.8,   1.2,   NULL,  4.0),
  ('APTT', '活化部分凝血活酶时间','s',            25,    35,    NULL,  NULL)
ON CONFLICT (code) DO NOTHING;

INSERT INTO clinical.lab_panel_items (panel_id, item_id, display_order)
SELECT p.id, i.id, m.ord
FROM (VALUES
  ('CBC', 'HGB',  1),
  ('CBC', 'WBC',  2),
  ('CBC', 'PLT',  3),
  ('BIO', 'K',    1),
  ('BIO', 'NA',   2),
  ('BIO', 'GLU',  3),
  ('BIO', 'ALT',  4),
  ('BIO', 'TBIL', 5),
  ('BIO', 'CR',   6),
  ('BIO', 'cTnI', 7),
  ('COAG','PT',   1),
  ('COAG','INR',  2),
  ('COAG','APTT', 3)
) AS m(panel_code, item_code, ord)
JOIN clinical.lab_panels p ON p.code = m.panel_code
JOIN clinical.lab_items  i ON i.code = m.item_code
ON CONFLICT (panel_id, item_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 权限码与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('lis:catalog',  '检验项目目录维护', 'lab', '检验面板与项目目录维护'),
  ('lis:request',  '检验申请',        'lab', '开立检验申请单'),
  ('lis:collect',  '标本采集',        'lab', '标本采集与送检'),
  ('lis:receive',  '标本签收/拒收',  'lab', '标本签收或拒收登记'),
  ('lis:enter',    '结果录入',        'lab', '检验结果录入与报告草稿'),
  ('lis:review',   '报告审核',        'lab', '检验报告审核（职责分离）'),
  ('lis:publish',  '报告发布',        'lab', '检验报告发布与电子签名')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT v.role_code, v.permission_code
FROM (VALUES
  ('admin',      'lis:catalog'),
  ('admin',      'lis:request'),
  ('admin',      'lis:collect'),
  ('admin',      'lis:receive'),
  ('admin',      'lis:enter'),
  ('admin',      'lis:review'),
  ('admin',      'lis:publish'),
  ('doctor',     'lis:request'),
  ('nurse',      'lis:collect'),
  ('technician',  'lis:catalog'),
  ('technician',  'lis:receive'),
  ('technician',  'lis:enter'),
  ('technician',  'lis:review'),
  ('technician',  'lis:publish')
) AS v(role_code, permission_code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.role_code = v.role_code AND rp.permission_code = v.permission_code
);
