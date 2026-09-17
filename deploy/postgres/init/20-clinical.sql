-- ============================================================================
-- 健澜科技杠OS - 临床业务表
-- 20-clinical.sql
--
-- 隐私设计：患者身份证号/电话不存明文——身份证仅存 SHA-256 哈希（用于查重），
-- 手机号等使用 AES-GCM 加密列；姓名默认脱敏展示，明文由应用层按需解密并审计。
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

-- 患者主索引
CREATE TABLE clinical.patients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn             text NOT NULL UNIQUE,           -- 院内病历号（脱敏ID）
  name_masked     text NOT NULL,                  -- 脱敏姓名（如 张*三）
  name_enc        text,                           -- 真实姓名（AES-GCM 加密）
  gender          text CHECK (gender IN ('男','女','未知','未说明')),
  birth_date      date,
  id_card_hash    text,                           -- 身份证号 SHA-256 哈希（不存明文）
  phone_enc       text,                           -- 手机号（加密）
  insurance_no_enc text,                          -- 医保/就诊卡号（加密）
  blood_type      text,
  allergies       jsonb NOT NULL DEFAULT '[]',    -- 过敏史 [{allergen,reaction,severity}]
  past_history    jsonb NOT NULL DEFAULT '[]',    -- 既往史
  tags            jsonb NOT NULL DEFAULT '[]',    -- 慢病种/高危标签
  data_level      smallint NOT NULL DEFAULT 3 CHECK (data_level BETWEEN 1 AND 4), -- 数据分级 L1-L4
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE UNIQUE INDEX idx_patients_idcard_hash ON clinical.patients(id_card_hash) WHERE id_card_hash IS NOT NULL;
CREATE INDEX idx_patients_name_trgm ON clinical.patients USING gin (name_masked gin_trgm_ops);
CREATE INDEX idx_patients_tags ON clinical.patients USING gin (tags);
CREATE TRIGGER trg_clinical_patients_updated BEFORE UPDATE ON clinical.patients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 就诊（门诊/急诊/住院/体检）
CREATE TABLE clinical.visits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        uuid NOT NULL REFERENCES clinical.patients(id),
  visit_no          text NOT NULL UNIQUE,
  visit_type        text NOT NULL CHECK (visit_type IN ('outpatient','emergency','inpatient','checkup')),
  department        text NOT NULL,
  ward              text,
  bed_no            text,
  attending_doctor_id uuid REFERENCES iam.users(id),
  chief_complaint   text,
  status            text NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing','discharged','transferred','cancelled')),
  triage_level      text CHECK (triage_level IN ('急诊','加急','普通')),
  admit_at          timestamptz,
  discharge_at      timestamptz,
  -- 医保/DRG
  drg_group         text,
  dip_group         text,
  total_fee         numeric(12,2),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_visits_patient ON clinical.visits(patient_id, admit_at DESC);
CREATE INDEX idx_visits_dept_status ON clinical.visits(department, status);
CREATE TRIGGER trg_clinical_visits_updated BEFORE UPDATE ON clinical.visits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 病历文书（门诊病历/入院记录/病程/手术记录/出院记录/病案首页）
CREATE TABLE clinical.medical_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        uuid NOT NULL REFERENCES clinical.visits(id),
  record_type     text NOT NULL,                 -- outpatient/admission/progress/operative/discharge/front_page
  title           text NOT NULL,
  content         jsonb NOT NULL DEFAULT '{}',   -- 结构化病历
  plain_text      text,                          -- 纯文本（供全文检索/质控）
  author_id       uuid REFERENCES iam.users(id),
  ai_generated    boolean NOT NULL DEFAULT false,
  ai_model        text,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','signed','archived','returned')),
  quality_score   numeric(5,2),
  quality_issues  jsonb NOT NULL DEFAULT '[]',
  signed_at       timestamptz,
  signed_by       uuid REFERENCES iam.users(id),
  version         integer NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX idx_records_visit ON clinical.medical_records(visit_id);
CREATE INDEX idx_records_type_status ON clinical.medical_records(record_type, status);
CREATE INDEX idx_records_content_gin ON clinical.medical_records USING gin (content jsonb_path_ops);
CREATE INDEX idx_records_ft ON clinical.medical_records USING gin (to_tsvector('simple', COALESCE(plain_text,'')));
CREATE TRIGGER trg_clinical_records_updated BEFORE UPDATE ON clinical.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 处方头
CREATE TABLE clinical.prescriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  rx_no         text NOT NULL UNIQUE,
  prescriber_id uuid REFERENCES iam.users(id),
  status        text NOT NULL DEFAULT 'pending_review'
                  CHECK (status IN ('draft','pending_review','approved','rejected','dispensed','cancelled')),
  reviewer_id   uuid REFERENCES iam.users(id),
  review_level  text CHECK (review_level IN ('auto','single','double')),
  risk_level    text CHECK (risk_level IN ('pass','warn','reject')),
  audit_result  jsonb NOT NULL DEFAULT '{}',     -- 处方审核结论
  counsel       text,
  total_fee     numeric(12,2),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rx_visit ON clinical.prescriptions(visit_id);
CREATE INDEX idx_rx_status ON clinical.prescriptions(status);
CREATE TRIGGER trg_clinical_rx_updated BEFORE UPDATE ON clinical.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 处方明细
CREATE TABLE clinical.prescription_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES clinical.prescriptions(id) ON DELETE CASCADE,
  drug_code       text,
  drug_name       text NOT NULL,
  specification   text,
  dosage          numeric(10,3),                 -- 单次剂量
  dosage_unit     text,
  frequency       text,                          -- bid/tid/qd...
  route           text,                          -- 给药途径
  days_supply     integer,
  quantity        numeric(12,2),
  quantity_unit   text,
  skin_test       boolean NOT NULL DEFAULT false,
  remark          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rx_items_prescription ON clinical.prescription_items(prescription_id);
CREATE INDEX idx_rx_items_drug ON clinical.prescription_items(drug_name);

-- 医嘱
CREATE TABLE clinical.orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  order_no      text NOT NULL UNIQUE,
  order_type    text NOT NULL CHECK (order_type IN ('drug','lab','imaging','treatment','nursing','diet','other')),
  content       text NOT NULL,
  detail        jsonb NOT NULL DEFAULT '{}',
  priority      text NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine','urgent','stat')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','executed','cancelled','audited')),
  doctor_id     uuid REFERENCES iam.users(id),
  start_at      timestamptz,
  stop_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_visit ON clinical.orders(visit_id);
CREATE INDEX idx_orders_type_status ON clinical.orders(order_type, status);
CREATE TRIGGER trg_clinical_orders_updated BEFORE UPDATE ON clinical.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 检验结果（按项目行存储，便于危急值与趋势分析）
CREATE TABLE clinical.lab_results (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id    uuid NOT NULL REFERENCES clinical.patients(id),
  report_no     text,
  panel_name    text,                           -- 检验组合（血常规/肝功能…）
  item_name     text NOT NULL,
  item_code     text,                           -- LOINC
  specimen      text,
  value         text,
  numeric_value numeric(14,4),
  unit          text,
  ref_low       numeric(14,4),
  ref_high      numeric(14,4),
  abnormal_flag text CHECK (abnormal_flag IN ('H','L','HH','LL','N')),
  is_critical   boolean NOT NULL DEFAULT false,
  result_time   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lab_visit ON clinical.lab_results(visit_id);
CREATE INDEX idx_lab_patient_time ON clinical.lab_results(patient_id, result_time DESC);
CREATE INDEX idx_lab_critical ON clinical.lab_results(is_critical) WHERE is_critical;
CREATE INDEX idx_lab_item ON clinical.lab_results(item_code);

-- 影像报告
CREATE TABLE clinical.imaging_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id      uuid NOT NULL REFERENCES clinical.patients(id),
  study_uid       text,                         -- DICOM Study Instance UID
  modality        text CHECK (modality IN ('CR','DX','CT','MR','US','XA','PT','NM','MG')),
  exam_name       text NOT NULL,
  body_part       text,
  findings        text,
  impression      text,
  ai_findings     jsonb NOT NULL DEFAULT '{}',  -- AI 辅助检出（如肺结节）
  is_critical     boolean NOT NULL DEFAULT false,
  report_time     timestamptz,
  image_refs      jsonb NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_img_visit ON clinical.imaging_reports(visit_id);
CREATE INDEX idx_img_patient_time ON clinical.imaging_reports(patient_id, report_time DESC);
CREATE INDEX idx_img_critical ON clinical.imaging_reports(is_critical) WHERE is_critical;
