-- ============================================================================
-- 健澜科技 jlmedaios - AI 辅助诊断增强（M144-A）【AI核心能力深化】
--
-- 【业务目标】门诊医生在录入主诉/症状后，AI 规则引擎给出：
--   Top3 可能诊断（带置信度）/ 鉴别诊断 / 建议检查 / 治疗方向。
--   医疗安全红线：AI 只是建议，最终诊断决定权在执业医师；
--   医生「采纳 / 修改 / 驳回」一律留痕 feedback_log，回流用于模型优化与校准。
--
-- 【留痕要求】
--   ai_diagnosis_suggestion：每次 AI 生成的建议快照（Top3 + 置信度 + 依据）。
--   ai_diagnosis_feedback_log：医生对建议的处置（accepted/modified/rejected），
--     同时记录医生最终诊断与 AI Top1 是否一致，用于统计诊断准确率。
--
-- 【隐私】症状/主诉按病历文本存储；医生、患者引用均为内部 ID，不出院。
-- 幂等：重复执行不报错、不清空已有数据。
-- 不触碰 WebSocket：本版仅 REST 拉取/回写。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ----------------------------------------------------------------------------
-- AI 诊断建议主表（ai_diagnosis_suggestion）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.ai_diagnosis_suggestion (
  id                uuid PRIMARY KEY,
  -- 就诊号（门诊一次就诊一条建议）
  visit_id          text NOT NULL DEFAULT '',
  -- 患者 ID（内部引用，不外泄）
  patient_id        text NOT NULL DEFAULT '',
  -- 患者年龄 / 性别（参与置信度修正：年龄带、性别好发倾向）
  patient_age       integer NOT NULL DEFAULT 0 CHECK (patient_age >= 0 AND patient_age <= 150),
  patient_gender    text NOT NULL DEFAULT ''
                    CHECK (patient_gender IN ('', 'male', 'female')),
  -- 主诉 / 症状（原始文本数组）
  symptoms          text[] NOT NULL DEFAULT '{}',
  -- 既往病史（慢病/手术/过敏等，文本数组）
  history           text[] NOT NULL DEFAULT '{}',
  -- Top3 候选诊断（JSON：诊断名 / ICD10 / 置信度 / 支持依据）
  top_candidates    jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 鉴别诊断列表
  differential      text[] NOT NULL DEFAULT '{}',
  -- 建议检查列表
  suggested_exams   text[] NOT NULL DEFAULT '{}',
  -- 治疗方向列表
  treatment_plan    text[] NOT NULL DEFAULT '{}',
  -- 最高置信度 0~1
  confidence        numeric(4,3) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  -- 风险提示（红旗症状 / 危急情况）
  risk_warnings     text[] NOT NULL DEFAULT '{}',
  -- 状态：pending（待医生处置）/ reviewed（已处置）
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'reviewed')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.ai_diagnosis_suggestion IS
  'AI核心能力深化(M144-A)：AI 辅助诊断建议快照，仅为建议，最终诊断以执业医师为准';
COMMENT ON COLUMN clinical.ai_diagnosis_suggestion.top_candidates IS
  'Top3 候选诊断 JSON：[{diagnosis, icd10, confidence, evidence[]}]，按置信度降序';
COMMENT ON COLUMN clinical.ai_diagnosis_suggestion.confidence IS
  'Top1 置信度 0~1，规则引擎启发式打分，经年龄/性别/病史修正后归一';
COMMENT ON COLUMN clinical.ai_diagnosis_suggestion.status IS
  'pending=待医生处置；reviewed=医生已采纳/修改/驳回并写入 feedback_log';

-- 按就诊号反查建议
CREATE INDEX IF NOT EXISTS idx_ai_diagnosis_suggestion_visit
  ON clinical.ai_diagnosis_suggestion (visit_id);
-- 按医生后续统计：按创建时间区间扫描待复核/已复核
CREATE INDEX IF NOT EXISTS idx_ai_diagnosis_suggestion_created
  ON clinical.ai_diagnosis_suggestion (created_at DESC);

-- ----------------------------------------------------------------------------
-- 医生处置留痕表（ai_diagnosis_feedback_log）——采纳/驳回/修改全部留痕
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.ai_diagnosis_feedback_log (
  id                  uuid PRIMARY KEY,
  -- 关联建议
  suggestion_id       uuid NOT NULL
                    REFERENCES clinical.ai_diagnosis_suggestion (id),
  -- 处置医生
  doctor_id           text NOT NULL DEFAULT '',
  -- 医生最终诊断（医生实际下的诊断）
  final_diagnosis     text NOT NULL DEFAULT '',
  -- AI Top1 诊断（留快照，便于回溯）
  ai_top_diagnosis    text NOT NULL DEFAULT '',
  -- AI Top1 置信度快照
  ai_top_confidence   numeric(4,3) NOT NULL DEFAULT 0,
  -- 医生处置动作：accepted=采纳AI Top1 / modified=采纳后修改 / rejected=驳回
  action              text NOT NULL DEFAULT 'rejected'
                      CHECK (action IN ('accepted', 'modified', 'rejected')),
  -- 医生最终诊断是否与 AI Top1 一致（用于准确率统计）
  matched_top1        boolean NOT NULL DEFAULT false,
  -- 医生补充说明/驳回理由
  note                text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.ai_diagnosis_feedback_log IS
  'AI核心能力深化(M144-A)：医生对 AI 诊断建议的采纳/修改/驳回留痕，回流用于模型优化与准确率校准';
COMMENT ON COLUMN clinical.ai_diagnosis_feedback_log.action IS
  'accepted=采纳AI Top1；modified=采纳后修改；rejected=完全驳回';
COMMENT ON COLUMN clinical.ai_diagnosis_feedback_log.matched_top1 IS
  '医生最终诊断是否与 AI Top1 一致，统计诊断准确率的核心口径';

-- 按医生 + 时间区间统计诊断准确率
CREATE INDEX IF NOT EXISTS idx_ai_diagnosis_feedback_doctor_time
  ON clinical.ai_diagnosis_feedback_log (doctor_id, created_at DESC);
-- 按动作聚合
CREATE INDEX IF NOT EXISTS idx_ai_diagnosis_feedback_action
  ON clinical.ai_diagnosis_feedback_log (action);
