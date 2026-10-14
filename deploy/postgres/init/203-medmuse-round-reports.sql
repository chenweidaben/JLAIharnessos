-- ============================================================================
-- 健澜科技 jlmedaios · M89-C MEDMUSE 晨间查房交班报告
--
-- 医疗安全：每日每医生一份报告（UNIQUE(doctor_id, report_date)），重复生成走
-- ON CONFLICT DO UPDATE 幂等覆盖；异常患者/待办以 jsonb 快照留痕。
--
-- 幂等：CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.medmuse_round_reports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id        uuid NOT NULL REFERENCES iam.users(id),
  report_date      date NOT NULL DEFAULT current_date,
  summary          text NOT NULL DEFAULT '',
  abnormal_patients jsonb NOT NULL DEFAULT '[]'::jsonb,
  pending_tasks    jsonb NOT NULL DEFAULT '[]'::jsonb,
  patient_count    int  NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_medmuse_round_reports_doctor
  ON clinical.medmuse_round_reports(doctor_id, report_date DESC);
