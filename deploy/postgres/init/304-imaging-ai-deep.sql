-- ============================================================================
-- 健澜科技 jlmedaios - 医学影像 AI 能力深化：imaging_ai_result 病灶级扩展（M152-A）
--
-- 【AI能力深化】
--   在 M138-A clinical.imaging_ai_result 基础上新增病灶级字段，支撑
--   POST /api/v1/imaging/ai/lesion 的落库与阅片工作台展示：
--
-- 新增字段：
--   lesion_location   text   病灶解剖定位（如「右肺上叶」「肝 S7 段」）
--   lesion_size        text   病灶大小（人类可读，如「约 20.0 mm」）
--   confidence         numeric(5,4)  单病灶置信度 0~1
--   differential_list  jsonb  鉴别诊断列表（数组）
--   modality           text   成像模态：CT / MRI / X-ray / Ultrasound
--
-- 支持模态：CT / MRI / X-ray / Ultrasound（在原 chest_xray/ct/xray 基础上扩展）。
--
-- 医疗安全红线：
--   - AI 只是辅助，最终诊断由医生确认；doctor_status 仍默认 pending；
--   - 本表不存患者直接标识，patient_id 仅为院内就诊号；
--   - 不触碰 WebSocket。
--
-- 幂等：重复执行不会报错、不会清空已有数据。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- 若基础表不存在（全新部署），先建出与 M138-A 等价的骨架，再叠加深化字段。
CREATE TABLE IF NOT EXISTS clinical.imaging_ai_result (
  id                 uuid PRIMARY KEY,
  patient_id         text NOT NULL DEFAULT '',
  study_type         text NOT NULL DEFAULT 'ct',
  image_features     jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggestions        jsonb NOT NULL DEFAULT '[]'::jsonb,
  overall_confidence numeric(5,4) NOT NULL DEFAULT 0,
  report             text NOT NULL DEFAULT '',
  doctor_status      text NOT NULL DEFAULT 'pending',
  doctor_comment     text NOT NULL DEFAULT '',
  confirmed_by       uuid NULL,
  confirmed_at       timestamptz NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 【AI能力深化】新增病灶级字段（幂等）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.imaging_ai_result
  ADD COLUMN IF NOT EXISTS lesion_location  text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lesion_size      text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS confidence       numeric(5,4) NOT NULL DEFAULT 0
    CHECK (confidence >= 0 AND confidence <= 1),
  ADD COLUMN IF NOT EXISTS differential_list jsonb     NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS modality         text        NOT NULL DEFAULT 'CT';

-- ----------------------------------------------------------------------------
-- 扩展 study_type 取值：在原有 chest_xray/ct/xray 基础上纳入 MRI / Ultrasound / 规范写法
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.imaging_ai_result
  DROP CONSTRAINT IF EXISTS imaging_ai_result_study_type_check;

ALTER TABLE clinical.imaging_ai_result
  ADD CONSTRAINT imaging_ai_result_study_type_check
  CHECK (study_type IN (
    'chest_xray', 'ct', 'xray',
    'mri', 'ultrasound',
    'CT', 'MRI', 'X-ray', 'Ultrasound'
  ));

-- modality 取值约束（幂等）
ALTER TABLE clinical.imaging_ai_result
  DROP CONSTRAINT IF EXISTS imaging_ai_result_modality_check;

ALTER TABLE clinical.imaging_ai_result
  ADD CONSTRAINT imaging_ai_result_modality_check
  CHECK (modality IN ('CT', 'MRI', 'X-ray', 'Ultrasound'));

-- 按模态检索历史 AI 病灶建议
CREATE INDEX IF NOT EXISTS idx_imaging_ai_result_modality
  ON clinical.imaging_ai_result (modality, created_at DESC);

COMMENT ON TABLE clinical.imaging_ai_result IS
  '医学影像 AI 辅助结果表（M138-A 基础 + M152-A 病灶级深化）；AI 仅辅助，辅助诊断最终由医生确认';
COMMENT ON COLUMN clinical.imaging_ai_result.lesion_location IS '病灶解剖定位（AI 辅助，待医师确认）';
COMMENT ON COLUMN clinical.imaging_ai_result.lesion_size      IS '病灶大小（人类可读，AI 辅助）';
COMMENT ON COLUMN clinical.imaging_ai_result.confidence       IS '单病灶置信度 0~1（AI 辅助）';
COMMENT ON COLUMN clinical.imaging_ai_result.differential_list IS '鉴别诊断列表 jsonb（AI 辅助，待医师确认）';
COMMENT ON COLUMN clinical.imaging_ai_result.modality         IS '成像模态：CT/MRI/X-ray/Ultrasound';
