-- ============================================================================
-- 健澜科技 jlmedaios · M17-D 不良事件后结构化评估闭环
--
-- 在 clinical.nursing_risk_events（M17-A）之上补"事件后结构化评估"：
--   nursing_event_reviews 一事件一份（UNIQUE(event_id)），记录跌倒后评估
--   （发生时间/地点/经过/伤情/急救/家属告知/风险复评/随访计划）。
--
-- 同时把迁移 98 仍 pending 的两个 NQI 转 auto：
--   NQI_PRESSURE_INJURY / NQI_FALL_INCIDENT
--   口径：分子=周期内对应事件例数，分母=周期内在院就诊数（复用 getRiskMetrics 现有分母）。
--
-- 权限码：event_review:read（护士/医生/admin）、event_review:write（护士/医生/admin）。
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.nursing_event_reviews (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              uuid NOT NULL REFERENCES clinical.nursing_risk_events(id),
  visit_id              uuid NOT NULL,
  occurred_at           timestamptz NOT NULL,
  location              text,
  circumstances         text,
  injuries              text,
  witness               boolean,
  first_aid             text,
  family_notified       boolean,
  risk_rescore_level    text CHECK (risk_rescore_level IS NULL OR risk_rescore_level IN ('high','medium','low')),
  follow_up_plan        text,
  reviewed_by           uuid NOT NULL REFERENCES iam.users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id)
);
CREATE INDEX IF NOT EXISTS idx_event_reviews_visit ON clinical.nursing_event_reviews(visit_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('event_review:read', '不良事件评估只读', 'event_review', '查看不良事件后结构化评估（护士/医生/admin）'),
  ('event_review:write', '不良事件评估登记', 'event_review', '跌倒后评估/压疮事件分级登记（护士/医生/admin）')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：read+write 授 nurse/doctor/admin
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (VALUES ('admin','event_review:read'),('admin','event_review:write'),
  ('doctor','event_review:read'),('doctor','event_review:write'),
  ('nurse','event_review:read'),('nurse','event_review:write')) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);

-- ---------------------------------------------------------------------------
-- 迁移 98 种子：两个 NQI pending -> auto
-- ---------------------------------------------------------------------------
UPDATE clinical.nursing_indicators
SET source_type = 'auto',
    description = '来自 clinical.nursing_risk_events：分子=周期内对应事件例数，分母=周期内在院就诊数（与 getRiskMetrics 一致）'
WHERE code IN ('NQI_PRESSURE_INJURY', 'NQI_FALL_INCIDENT');
