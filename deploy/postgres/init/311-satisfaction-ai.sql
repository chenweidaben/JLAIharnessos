-- ============================================================================
-- 健澜科技 jlmedaios · M153-D 患者满意度智能化分析（临床决策支持）
-- 311-satisfaction-ai.sql
--
-- 在 clinical.satisfaction_surveys 上扩展 AI 智能分析字段：
--   - nps_score：净推荐值（0-10，患者愿意推荐程度）
--   - emotion_sentiment：情感倾向（positive/neutral/negative）
--   - key_issues[]：从自由文本评论中抽取的关键问题标签
--   - improvement_suggestions[]：基于低分维度自动生成的改进建议
--
-- 【临床决策支持】本扩展不替代医师诊断，仅作为运营改进与患者体验
--                 闭环的结构化留痕；分析逻辑见
--                 src/bff/aggregators/satisfactionAiAggregator.ts。
--
-- 幂等：ADD COLUMN IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 扩展已有满意度评价表
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.satisfaction_surveys
  ADD COLUMN IF NOT EXISTS nps_score            smallint,
  ADD COLUMN IF NOT EXISTS emotion_sentiment   text,
  ADD COLUMN IF NOT EXISTS key_issues          jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS improvement_suggestions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 情感倾向枚举约束（历史数据不回填，仅约束新写入）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_satisfaction_emotion_sentiment'
  ) THEN
    ALTER TABLE clinical.satisfaction_surveys
      ADD CONSTRAINT chk_satisfaction_emotion_sentiment
      CHECK (emotion_sentiment IS NULL
             OR emotion_sentiment IN ('positive','neutral','negative'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_satisfaction_nps_score'
  ) THEN
    ALTER TABLE clinical.satisfaction_surveys
      ADD CONSTRAINT chk_satisfaction_nps_score
      CHECK (nps_score IS NULL OR nps_score BETWEEN 0 AND 10);
  END IF;
END $$;

-- AI 分析字段查询索引（按情感倾向拉取负面反馈做改进闭环）
CREATE INDEX IF NOT EXISTS idx_satisfaction_emotion
  ON clinical.satisfaction_surveys(emotion_sentiment, submitted_at DESC)
  WHERE emotion_sentiment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_satisfaction_nps
  ON clinical.satisfaction_surveys(nps_score)
  WHERE nps_score IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. 权限点：满意度智能分析报告
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('satisfaction:ai-report', '满意度智能分析', 'service',
   '查看患者评论情感分析、关键问题抽取与自动改进计划（临床决策支持）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code = 'satisfaction:ai-report'
ON CONFLICT (role_code, permission_code) DO NOTHING;
