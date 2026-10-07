-- ============================================================================
-- 健澜科技 jlmedaios · M12-A 检查检验结果 AI 智能解读（后端垂直切片）
-- 93-ai-interpretation.sql
--
-- 在 M3-E 纯规则解读（clinical.lab_interpretations）之上叠加可插拔 LLM 深度解读，
-- 并新增影像报告 AI 解读（clinical.imaging_interpretations）。
--
-- 核心设计：
--   一、扩展 lab_interpretations：医师/患者双视角（audience）、LLM 来源与三态标注
--       （deep_source / llm_status）、整体印象、逐项解释、确定性趋势、分级建议、
--       患者端通俗总结；唯一约束由 visit_id 单列改为 (visit_id, audience)。
--   二、新建 imaging_interpretations：一个影像报告 × 一个视角一行；报告须已发布
--       方可解读；同样带 LLM 三态与签名/退回状态机。
--   三、新增权限码 imaging:interpret:view / imaging:interpret:sign，并按角色授权。
--
-- 医疗安全红线：AI 仅辅助，不做确定性诊断、不自主出报告；解读草稿须医师签名后生效；
-- 未配置 LLM 时明确降级标注，绝不以写死文本冒充 LLM。
--
-- 幂等：ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS / DROP CONSTRAINT
--       IF EXISTS / ON CONFLICT DO NOTHING / NOT EXISTS 防重，触发器先 DROP 再建，
--       可重复执行。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 一、扩展 clinical.lab_interpretations（原 M3-E，visit_id 唯一）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.lab_interpretations
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'doctor'
    CHECK (audience IN ('doctor', 'patient'));
ALTER TABLE clinical.lab_interpretations
  ADD COLUMN IF NOT EXISTS deep_source text NOT NULL DEFAULT 'rule'
    CHECK (deep_source IN ('rule', 'llm', 'llm_fallback'));
ALTER TABLE clinical.lab_interpretations
  ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE clinical.lab_interpretations
  ADD COLUMN IF NOT EXISTS overall_impression text;
ALTER TABLE clinical.lab_interpretations
  ADD COLUMN IF NOT EXISTS item_explanations jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE clinical.lab_interpretations
  ADD COLUMN IF NOT EXISTS trends jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE clinical.lab_interpretations
  ADD COLUMN IF NOT EXISTS recommendations jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE clinical.lab_interpretations
  ADD COLUMN IF NOT EXISTS plain_language_summary text;
ALTER TABLE clinical.lab_interpretations
  ADD COLUMN IF NOT EXISTS llm_status text NOT NULL DEFAULT 'rule_only'
    CHECK (llm_status IN ('llm_ok', 'llm_not_configured', 'llm_error', 'rule_only'));

-- 唯一约束变更：原 inline UNIQUE 自动名为 lab_interpretations_visit_id_key。
-- 历史行 audience 默认 'doctor'，新复合唯一约束安全。
ALTER TABLE clinical.lab_interpretations
  DROP CONSTRAINT IF EXISTS lab_interpretations_visit_id_key;
ALTER TABLE clinical.lab_interpretations
  DROP CONSTRAINT IF EXISTS uq_lab_interp_visit_audience;
ALTER TABLE clinical.lab_interpretations
  ADD CONSTRAINT uq_lab_interp_visit_audience UNIQUE (visit_id, audience);

CREATE INDEX IF NOT EXISTS idx_lab_interp_audience ON clinical.lab_interpretations(audience);

-- ----------------------------------------------------------------------------
-- 二、新建 clinical.imaging_interpretations（影像报告 AI 解读）
--     一个报告 × 一个视角一行；报告须已发布方可解读；签名/退回状态机。
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.imaging_interpretations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id            uuid NOT NULL REFERENCES clinical.imaging_reports(id) ON DELETE CASCADE,
  visit_id             uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id           uuid NOT NULL REFERENCES clinical.patients(id),
  department           text NOT NULL DEFAULT '放射科',

  audience             text NOT NULL DEFAULT 'doctor'
                         CHECK (audience IN ('doctor', 'patient')),
  modality             text,
  exam_name            text,
  body_part            text,

  explained_findings   jsonb NOT NULL DEFAULT '[]'::jsonb,
  overall_direction    text,
  plain_language_summary text,
  recommendations      jsonb NOT NULL DEFAULT '[]'::jsonb,

  deep_source          text NOT NULL DEFAULT 'rule'
                         CHECK (deep_source IN ('rule', 'llm', 'llm_fallback')),
  model                text,
  llm_status           text NOT NULL DEFAULT 'rule_only'
                         CHECK (llm_status IN ('llm_ok', 'llm_not_configured', 'llm_error', 'rule_only')),

  status               text NOT NULL DEFAULT 'pending_review'
                         CHECK (status IN ('pending_review', 'signed', 'rejected')),
  generated_at         timestamptz NOT NULL DEFAULT now(),
  reviewed_by          uuid REFERENCES iam.users(id),
  reviewed_at          timestamptz,
  reject_reason        text,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_imaging_interp_report_audience UNIQUE (report_id, audience)
);

CREATE INDEX IF NOT EXISTS idx_imaging_interp_status ON clinical.imaging_interpretations(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_imaging_interp_department ON clinical.imaging_interpretations(department);
CREATE INDEX IF NOT EXISTS idx_imaging_interp_report ON clinical.imaging_interpretations(report_id);

DROP TRIGGER IF EXISTS trg_imaging_interp_updated ON clinical.imaging_interpretations;
CREATE TRIGGER trg_imaging_interp_updated BEFORE UPDATE ON clinical.imaging_interpretations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 三、权限码与角色授权
--     lab:interpret:* 由 M3-E 建立，此处仅新增 imaging:interpret:*。
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('imaging:interpret:view', '影像解读查看', 'imaging', '查看影像报告 AI 辅助解读草稿'),
  ('imaging:interpret:sign',  '影像解读签名', 'imaging', '对影像 AI 辅助解读草稿复核签名/退回')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（iam.role_permissions 与 userView.ts ROLE_PERMISSIONS 保持一致）：
-- admin 全量；doctor 给 lab 两码；technician 给 imaging 两码（M11-B 放射账号均为 technician）。
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT v.role_code, v.permission_code
FROM (VALUES
  ('admin',       'lab:interpret:view'),
  ('admin',       'lab:interpret:sign'),
  ('admin',       'imaging:interpret:view'),
  ('admin',       'imaging:interpret:sign'),
  ('doctor',      'lab:interpret:view'),
  ('doctor',      'lab:interpret:sign'),
  ('doctor',      'imaging:interpret:view'),
  ('doctor',      'imaging:interpret:sign'),
  ('technician',  'imaging:interpret:view'),
  ('technician',  'imaging:interpret:sign')
) AS v(role_code, permission_code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.role_code = v.role_code AND rp.permission_code = v.permission_code
);
