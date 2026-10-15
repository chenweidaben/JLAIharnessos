-- ============================================================================
-- M144-D: AI 质控智能审核（六大核心条款全覆盖：
--   主诉完整 / 现病史充分 / 诊断明确 / 用药合理 / 签名齐全 / 时限达标）
-- 健澜科技 jlmedaios
--
-- 问题分级：critical(致命) / major(严重) / minor(一般)
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- AI 质控审核结果留痕表：每次 aiQualityCheck 的判定结果随记录落库，
-- 供质控科复核、按科室/周期汇总 generateQualityReport 使用。
CREATE TABLE IF NOT EXISTS clinical.ai_quality_check (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id      text NOT NULL,                 -- 被审病历/文书记录 ID
  dept           text,                          -- 所属科室
  period         text,                          -- 统计周期（如 2026-10）
  score          integer NOT NULL DEFAULT 100,  -- 质控得分 0-100
  passed         boolean NOT NULL DEFAULT false,-- 是否通过（score>=80 且无 critical）
  issue_count    integer NOT NULL DEFAULT 0,    -- 问题总数
  critical_count integer NOT NULL DEFAULT 0,    -- critical 问题数
  major_count    integer NOT NULL DEFAULT 0,    -- major 问题数
  minor_count    integer NOT NULL DEFAULT 0,    -- minor 问题数
  result         jsonb NOT NULL DEFAULT '{}',   -- 完整 CheckResult（含 issues 明细）
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_quality_check_record ON clinical.ai_quality_check(record_id);
CREATE INDEX IF NOT EXISTS idx_ai_quality_check_dept   ON clinical.ai_quality_check(dept, period);

-- AI 质控反馈学习表：质控科人工复核结论回流，驱动规则「越用越准」
-- （learnFromQualityFeedback 沉淀，持续降低误报/漏报）。
CREATE TABLE IF NOT EXISTS clinical.ai_quality_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id   text NOT NULL,                 -- 被审记录 ID
  is_error    boolean NOT NULL,              -- AI 原判是否错误（true=误报/漏报）
  correction  text,                          -- 人工纠正说明
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_quality_feedback_record ON clinical.ai_quality_feedback(record_id);

-- 权限
INSERT INTO iam.permissions(code, name, module) VALUES
  ('ai_quality:check', 'AI质控智能审核-执行', 'qc'),
  ('ai_quality:view',  'AI质控智能审核-查看', 'qc')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin', 'ai_quality:check'),
  ('admin', 'ai_quality:view'),
  ('doctor','ai_quality:view')
ON CONFLICT DO NOTHING;
