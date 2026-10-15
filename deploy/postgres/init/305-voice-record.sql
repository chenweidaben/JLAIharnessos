-- M152-B: 病历 AI 语音录入与智能补全
-- 【AI能力深化】医生口述转写记录，支撑语音转结构化病历 / 智能补全 / 模板填充
-- Copyright (c) 2026 杭州健澜科技有限公司

CREATE TABLE IF NOT EXISTS clinical.voice_transcript (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id         uuid REFERENCES clinical.visits(id),
  patient_id       uuid REFERENCES clinical.patients(id),
  clinician_id     uuid NOT NULL REFERENCES iam.users(id),
  record_type      text NOT NULL DEFAULT 'progress'
                   CHECK (record_type IN ('admission','progress','consult','discharge')),
  -- 语音中台回传的原始转写文本（原始音频不落库，仅存转写结果与特征）
  raw_transcript   text NOT NULL,
  -- 结构化病历 JSON：主诉/现病史/查体/诊断/处理意见/识别出的医疗术语
  structured       jsonb NOT NULL DEFAULT '{}'::jsonb,
  recognized_terms text[] NOT NULL DEFAULT '{}',
  confidence       numeric(4,3) NOT NULL DEFAULT 0
                   CHECK (confidence >= 0 AND confidence <= 1),
  audio_duration   integer,                 -- 录音时长（秒）
  model_version    text,
  status           text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','confirmed','rejected')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  confirmed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_voice_transcript_visit ON clinical.voice_transcript(visit_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcript_clinician ON clinical.voice_transcript(clinician_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcript_status ON clinical.voice_transcript(status);
CREATE INDEX IF NOT EXISTS idx_voice_transcript_created ON clinical.voice_transcript(created_at DESC);

-- 智能补全权限
INSERT INTO iam.permissions(code, name, module) VALUES
  ('voice_record:transcribe', '语音病历-语音转写', 'emr'),
  ('voice_record:complete',   '语音病历-智能补全', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','voice_record:transcribe'),
  ('doctor','voice_record:complete'),
  ('admin','voice_record:transcribe'),
  ('admin','voice_record:complete')
ON CONFLICT DO NOTHING;
