-- M87-D: EMR评级自评指标
CREATE TABLE IF NOT EXISTS clinical.emr_assessment_metrics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_code   text NOT NULL UNIQUE,
  metric_name   text NOT NULL,
  category     text NOT NULL CHECK (category IN ('document_quality','timeliness','compliance','integration','security')),
  target_value  numeric NOT NULL,
  current_value numeric NOT NULL DEFAULT 0,
  unit         text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','pass','fail')),
  measured_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO clinical.emr_assessment_metrics (metric_code, metric_name, category, target_value, unit) VALUES
  ('admission_note_24h', '入院记录24h完成率', 'timeliness', 0.95, '%'),
  ('first_progress_8h', '首次病程8h完成率', 'timeliness', 0.95, '%'),
  ('daily_progress_24h', '日常病程24h完成率', 'timeliness', 0.98, '%'),
  ('consent_signed', '知情同意书签署率', 'compliance', 1.0, '%'),
  ('discharge_summary_7d', '出院小结7天完成率', 'timeliness', 0.95, '%'),
  ('surgery_record_24h', '手术记录24h完成率', 'timeliness', 0.95, '%'),
  ('medical_qc_rate', '病历质控覆盖率', 'quality', 0.90, '%'),
  ('header_verified', '病历首页审核率', 'quality', 1.0, '%'),
  ('system_uptime', '系统可用率', 'integration', 0.995, '%'),
  ('data_accuracy', '数据准确率', 'quality', 0.99, '%');

INSERT INTO iam.permissions(code, name, module) VALUES
  ('emr_assessment:view', 'EMR评级-查看', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin','emr_assessment:view'), ('doctor','emr_assessment:view')
ON CONFLICT DO NOTHING;
