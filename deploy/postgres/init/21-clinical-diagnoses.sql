-- ============================================================================
-- 健澜科技 jlmedaios - 门诊诊断表与就诊咨询明细
-- 21-clinical-diagnoses.sql
--
-- 背景：20-clinical.sql 未对"门诊诊断"单独建模（诊断散见于病历/处方）。
-- 门诊工作台的诊断面板需要独立、可增删、可确认的诊断持久化，并与就诊/患者/医师
-- 形成完整外键闭环，故新增 clinical.diagnoses。
--
-- 同时为 clinical.visits 增加 consultation_detail jsonb，用于持久化结构化问诊
-- 内容（现病史/既往史/体格检查等）；visit.chief_complaint 仍存主诉。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

-- 门诊/急诊诊断
CREATE TABLE IF NOT EXISTS clinical.diagnoses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id    uuid NOT NULL REFERENCES clinical.visits(id) ON DELETE CASCADE,
  patient_id  uuid NOT NULL REFERENCES clinical.patients(id),
  code        text,                                 -- ICD-10 编码
  name        text NOT NULL,                        -- 诊断名称
  kind        text NOT NULL DEFAULT 'primary'
                CHECK (kind IN ('primary','secondary','differential')),
  confirmed   boolean NOT NULL DEFAULT false,       -- 医师确认标记
  note        text,
  doctor_id   uuid REFERENCES iam.users(id),        -- 录入医师
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diagnoses_visit ON clinical.diagnoses(visit_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_patient ON clinical.diagnoses(patient_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_code ON clinical.diagnoses(code);
DROP TRIGGER IF EXISTS trg_clinical_diagnoses_updated ON clinical.diagnoses;
CREATE TRIGGER trg_clinical_diagnoses_updated BEFORE UPDATE ON clinical.diagnoses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 就诊结构化问诊明细（主诉仍在 visits.chief_complaint）
ALTER TABLE clinical.visits
  ADD COLUMN IF NOT EXISTS consultation_detail jsonb;
