-- ============================================================================
-- 健澜科技 jlmedaios · M2-C 语音电子病历（语音口述 → 结构化病历）
--
--  真实落 PostgreSQL（去 mock）：
--   - clinical.voice_dictations 语音口述会话：
--       一次医师口述的音频引用、ASR 原始转写、医疗后处理规范文本、
--       分段/术语纠正/用药剂量提及/风险提示（供追溯），
--       经医师复核编辑后转换为正式病历，记录 resulting_record_id；
--   - 状态机：draft（待复核）→ converted（已转病历）/ discarded（作废）。
--
-- 职责与安全：
--   - 口述人 doctor_id 即会话 owner，转病历必须本人签名（应用层强制）；
--   - ASR 引擎可插拔（讯飞/阿里/腾讯/Azure/OpenAI 兼容），离线环境使用
--     明确标注的本地演示引擎（asr_provider='local-demo'），不以演示冒充真实识别；
--   - 剂量/频次等安全关键信息只标记、不臆改，由医师逐项核对后再入病历。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.voice_dictations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id              uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id            uuid NOT NULL REFERENCES clinical.patients(id),
  -- 口述医师（会话 owner，转病历须本人签名）
  doctor_id             uuid NOT NULL REFERENCES iam.users(id),
  -- 音频引用（对象存储 key / URL / 本地路径），不直接承载音频二进制
  audio_ref             text NOT NULL,
  audio_format          text,
  duration_ms           integer,
  -- ASR 引擎标识：local-demo（本地演示）/ openai / xfyun / aliyun / tencent / azure ...
  asr_provider          text NOT NULL,
  raw_transcript        text NOT NULL DEFAULT '',
  normalized_text       text NOT NULL DEFAULT '',
  segments              jsonb NOT NULL DEFAULT '[]'::jsonb,
  corrections           jsonb NOT NULL DEFAULT '[]'::jsonb,
  medication_mentions   jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings              jsonb NOT NULL DEFAULT '[]'::jsonb,
  avg_confidence        numeric(5,4),
  -- 状态：draft 待复核 / converted 已转病历 / discarded 作废
  status                text NOT NULL DEFAULT 'draft',
  resulting_record_id   uuid REFERENCES clinical.medical_records(id),
  converted_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT voice_dictations_format_check
    CHECK (audio_format IS NULL OR audio_format IN ('wav', 'mp3', 'm4a', 'pcm', 'ogg')),
  CONSTRAINT voice_dictations_status_check
    CHECK (status IN ('draft', 'converted', 'discarded')),
  CONSTRAINT voice_dictations_confidence_check
    CHECK (avg_confidence IS NULL OR (avg_confidence >= 0 AND avg_confidence <= 1))
);

CREATE INDEX IF NOT EXISTS idx_vdict_visit
  ON clinical.voice_dictations(visit_id, created_at);
CREATE INDEX IF NOT EXISTS idx_vdict_doctor
  ON clinical.voice_dictations(doctor_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_vdict_patient
  ON clinical.voice_dictations(patient_id);
CREATE INDEX IF NOT EXISTS idx_vdict_record
  ON clinical.voice_dictations(resulting_record_id);
