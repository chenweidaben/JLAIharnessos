-- ============================================================================
-- 健澜科技 jlmedaios - AI 合理用药深度审核（M144-C）「AI核心能力深化」
--
-- 背景：在 CDS 实时审查（211-drug-review）与药师越审越准沉淀（230）之上，
--       对一张处方做五维深度审核留痕：
--         药物相互作用 / 禁忌症 / 剂量合理性 / 特殊人群 / 重复用药。
--       每条审核结论以 findings(jsonb) 落库，并支持药师「误拦反馈」回流——
--       药师认为某条告警误拦时，按 finding_id 记录反馈原因与处理人，
--       false_positive_feedbacks 持续累加，用于误拦率度量与规则库迭代，
--       目标：误拦率持续下降、真拦率持续上升。
--
-- 医疗安全红线：
--  - 本表为 AI 辅助审核结论留痕，不自动驳回处方、不替代药师签名；
--  - 最终放行/拦截由医师与药师本人判断执行（人在回路）；
--  - AI 不自主改方、不替代临床承担用药责任。
--
-- 幂等：CREATE SCHEMA/TABLE/INDEX IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- 归属 medmuse schema（首次部署兜底建 schema，与既有审方学习表同域）
CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- AI 合理用药深度审核主表：一张处方一次审核一行
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.ai_drug_review (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid,
  prescription_id    text NOT NULL,
  -- 患者上下文（审核输入快照，脱敏后仅存结构化标签）
  patient_age        integer,
  patient_gender     text,
  allergies          jsonb NOT NULL DEFAULT '[]'::jsonb,   -- 过敏标签列表
  diseases           jsonb NOT NULL DEFAULT '[]'::jsonb,   -- 诊断/疾病标签列表
  current_meds       jsonb NOT NULL DEFAULT '[]'::jsonb,   -- 本次审核用药清单（通用名+剂量）
  -- 审核结论
  findings           jsonb NOT NULL DEFAULT '[]'::jsonb,   -- 五维告警明细（dimension/level/drug/reason/suggestion）
  overall_risk       text  NOT NULL DEFAULT 'none',        -- high / medium / low / none
  total_findings     integer NOT NULL DEFAULT 0,
  -- 药师处置
  review_status      text  NOT NULL DEFAULT 'pending',    -- pending / confirmed / overridden
  -- 误拦反馈留痕：[{ finding_id, reason, operator, feedback_at, type:'false_positive' }]
  false_positive_feedbacks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- 按处方反查最近一次审核结论
CREATE INDEX IF NOT EXISTS idx_ai_drug_review_prescription
  ON medmuse.ai_drug_review (prescription_id, created_at DESC);

-- 误拦率统计：按时间段 + 风险级别聚合
CREATE INDEX IF NOT EXISTS idx_ai_drug_review_risk_time
  ON medmuse.ai_drug_review (created_at DESC, overall_risk);

-- updated_at 自动刷新（依赖 public.set_updated_at，见既有初始化脚本）
DROP TRIGGER IF EXISTS trg_medmuse_ai_drug_review_updated ON medmuse.ai_drug_review;
CREATE TRIGGER trg_medmuse_ai_drug_review_updated BEFORE UPDATE ON medmuse.ai_drug_review
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限字典：ai_drug_review:view（药师审方页查看深度审核结论与误拦反馈）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions(code, name, module, description) VALUES
  ('ai_drug_review:view', 'AI合理用药深度审核', 'pharmacy',
   '查看处方五维深度审核结论、风险分级与误拦反馈留痕（药师/医生/admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('pharmacist',  'ai_drug_review:view'),
  ('doctor',      'ai_drug_review:view'),
  ('admin',       'ai_drug_review:view')
ON CONFLICT DO NOTHING;
