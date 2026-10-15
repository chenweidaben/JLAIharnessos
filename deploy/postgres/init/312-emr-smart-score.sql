-- ============================================================================
-- 健澜科技 jlmedaios · M154-B 电子病历智能化评分（AI深化与运营预测）
-- 312-emr-smart-score.sql
--
-- 表 clinical.emr_smart_score：
--   记录每份病历的六维智能评分结果，用于质控闭环与运营预测
--   （低分医师/科室趋势追踪、病历质量持续改进）。
--
-- 六维满分 100：
--   chief_complaint 10 / hpi_logic 20 / diagnosis 20 /
--   medication 20 / examination 15 / progress_timeliness 15
--
-- 【临床决策支持】评分由纯函数规则引擎产出（见
--   src/bff/aggregators/emrSmartScoreAggregator.ts），公平评分——
--   重诊断逻辑、用药匹配、检查适宜等实质内容，不抠格式。
--   评分结果为质控辅助，不替代医师与质控人员最终判定。
--
-- 幂等：CREATE TABLE IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.emr_smart_score (
  id                     bigserial PRIMARY KEY,
  tenant_id             text NOT NULL DEFAULT 'default',

  -- 关联对象（可空：支持对粘贴文本的即时评分，未落库病历）
  record_id             text,
  patient_id             text,
  dept_code             text,
  doctor_id             text,

  -- 六维得分（0..满分）
  chief_complaint_score smallint NOT NULL DEFAULT 0,   -- max 10
  hpi_logic_score       smallint NOT NULL DEFAULT 0,   -- max 20
  diagnosis_score       smallint NOT NULL DEFAULT 0,   -- max 20
  medication_score      smallint NOT NULL DEFAULT 0,   -- max 20
  examination_score     smallint NOT NULL DEFAULT 0,   -- max 15
  progress_timeliness_score smallint NOT NULL DEFAULT 0, -- max 15

  total_score           smallint NOT NULL DEFAULT 0,   -- 合计 0..100
  grade                 text NOT NULL DEFAULT '合格',   -- 优秀/良好/合格/不合格

  -- 缺陷与建议（结构化 JSONB，不存病历明文，避免敏感数据冗余）
  defects               jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggestions           jsonb NOT NULL DEFAULT '[]'::jsonb,

  scored_at             timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_emr_smart_score_total CHECK (total_score BETWEEN 0 AND 100),
  CONSTRAINT chk_emr_smart_score_grade CHECK (grade IN ('优秀','良好','合格','不合格'))
);

-- 多租户 + 按时间拉取评分趋势
CREATE INDEX IF NOT EXISTS idx_emr_smart_score_tenant_time
  ON clinical.emr_smart_score(tenant_id, scored_at DESC);

-- 科室/医师质量追踪
CREATE INDEX IF NOT EXISTS idx_emr_smart_score_dept
  ON clinical.emr_smart_score(tenant_id, dept_code, total_score)
  WHERE dept_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_emr_smart_score_doctor
  ON clinical.emr_smart_score(tenant_id, doctor_id, total_score)
  WHERE doctor_id IS NOT NULL;

-- 低分病历快速检索（<60 不合格，质控优先复核）
CREATE INDEX IF NOT EXISTS idx_emr_smart_score_low
  ON clinical.emr_smart_score(tenant_id, total_score)
  WHERE total_score < 60;

-- ----------------------------------------------------------------------------
-- 权限点：病历智能评分
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('emr:smart-score', '病历智能评分', 'clinical',
   '对电子病历进行六维智能化评分（主诉/现病史/诊断/用药/检查/病程及时性），质控辅助')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code = 'emr:smart-score'
ON CONFLICT (role_code, permission_code) DO NOTHING;
