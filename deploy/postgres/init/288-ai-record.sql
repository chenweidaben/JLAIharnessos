-- ============================================================================
-- 健澜科技 jlmedaios · M144-B AI 病历自动生成（医生修改后用于模型优化）
-- 288-ai-record.sql
--
-- 核心设计：
--   一、clinical.ai_record_generation：医师口述/批注（doctor_notes_raw）经本地规则引擎
--       结构化为六段病历草稿（主诉/现病史/既往史/体格检查/初步诊断/处理意见），
--       sections 以 jsonb 落库，整稿 draft_content 供前端直接预览/编辑。
--   二、医生修改后用于模型优化：医师复核修改后的 sections 落 doctor_feedback，
--       修改前后逐段 diff 留痕（diff_log），各段被修改频次等学习信号（edit_signals）
--       累计沉淀，作为后续病历生成模型微调/规则包迭代的监督信号。
--   三、状态机：draft（AI 起稿）→ revised（医师已修改复核）→ archived（归档）。
--
-- 医疗安全红线：AI 仅起稿辅助，不做确定性诊断、不自动归档；草稿须经医师本人修改
--   复核后方可归档；原始患者标识一律脱敏存储，不落明文 PII。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / ON CONFLICT DO NOTHING
--       / NOT EXISTS 防重，触发器先 DROP 再建，可重复执行。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 一、AI 病历生成草稿主表
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.ai_record_generation (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 就诊/患者标识以文本引用（纯函数层可接收合成 ID），不做强外键以解耦迁移顺序
  visit_id             text NOT NULL,
  patient_id           text,

  -- 医师原始口述/批注（自由文本，AI 结构化的输入）
  doctor_notes_raw     text NOT NULL DEFAULT '',
  -- 脱敏后的患者快照（性别/年龄/科室，不含明文姓名与证件号）
  patient_snapshot    jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- AI 结构化六段：chiefComplaint/presentIllness/pastHistory/physicalExam/
  --                diagnosis/treatmentPlan
  sections             jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 整稿纯文本（六段拼接，供前端 TextArea 预览/编辑）
  draft_content        text NOT NULL DEFAULT '',
  model_version        text NOT NULL DEFAULT 'jlmedaios-ai-record-v1',

  -- 医师修改复核后的六段（医生修改后用于模型优化的监督目标）
  doctor_feedback      jsonb,
  -- 修改前后逐段 diff 留痕：[{section, before, after, changed}]
  diff_log             jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 学习信号：各段被修改次数累计，供规则包/模型迭代
  edit_signals         jsonb NOT NULL DEFAULT '{}'::jsonb,

  status               text NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'revised', 'archived')),
  revised_by           uuid REFERENCES iam.users(id),
  revised_note         text,

  generated_at         timestamptz NOT NULL DEFAULT now(),
  revised_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- 同一就诊允许多次起稿（不同时间点），但同一就诊同状态草稿按生成时间倒序检索
CREATE INDEX IF NOT EXISTS idx_ai_record_visit ON clinical.ai_record_generation(visit_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_record_status ON clinical.ai_record_generation(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_record_model ON clinical.ai_record_generation(model_version);

DROP TRIGGER IF EXISTS trg_ai_record_updated ON clinical.ai_record_generation;
CREATE TRIGGER trg_ai_record_updated BEFORE UPDATE ON clinical.ai_record_generation
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 二、权限码与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('ai_record:generate', 'AI病历起稿', 'emr', '由医师口述/批注生成 AI 病历草稿'),
  ('ai_record:revise',   'AI病历复核修改', 'emr', '医师复核修改 AI 病历草稿并留痕学习')
ON CONFLICT (code) DO NOTHING;

-- admin 全量；doctor 起稿+复核；其余角色默认不授权
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT v.role_code, v.permission_code
FROM (VALUES
  ('admin',  'ai_record:generate'),
  ('admin',  'ai_record:revise'),
  ('doctor', 'ai_record:generate'),
  ('doctor', 'ai_record:revise')
) AS v(role_code, permission_code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.role_code = v.role_code AND rp.permission_code = v.permission_code
);
