-- ============================================================================
-- 健澜科技 jlmedaios · M17-A 住院患者压疮(Braden)/跌倒(Morse)风险预警与预防闭环
--
-- 补齐 M16-B 迁移 98 中 NQI_PRESSURE_INJURY / NQI_FALL_INCIDENT 的 pending 数据源：
--   评估域：clinical.nursing_risk_assessments  每次 Braden/Morse 评估（总分+分层+明细）；
--   预防域：clinical.nursing_risk_preventions   预防措施状态机
--              suggested(AI/医师建议草稿) -> accepted(护士确认) -> executed(护士本人签名执行)
--              任意未到 executed 前可 cancelled；
--   事件域：clinical.nursing_risk_events        皮肤结局(二期及以上压力性损伤)/跌倒不良事件登记。
--
-- 医疗安全红线：
--  - AI 不自主开医嘱：评估只生成 suggested 预防草稿，护士 accepted/executed 须本人签名；
--  - 分层与预警为辅助决策，最终护理措施由责任护士本人执行并签名；
--  - 事件登记为不良事件/皮肤结局的结构化入口，自动喂给 NQI 指标分子。
--
-- 权限码：nursing_risk:read   只读（护士/医生/admin 全员）；
--         nursing_risk:assess  评估登记与建议草稿生成（医生/admin）；
--         nursing_risk:execute 预防措施确认/执行/签名（护士/admin）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 风险评估（Braden 压疮 / Morse 跌倒）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.nursing_risk_assessments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     uuid NOT NULL REFERENCES clinical.visits(id),
  risk_type    text NOT NULL CHECK (risk_type IN ('pressure_ulcer','fall')),
  assess_no    text NOT NULL UNIQUE,
  items        jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score  int  NOT NULL,
  level        text NOT NULL CHECK (level IN ('low','medium','high')),
  note         text,
  assessed_by  uuid REFERENCES iam.users(id),
  assessed_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nursing_risk_assess_lookup
  ON clinical.nursing_risk_assessments(visit_id, risk_type, assessed_at DESC);
DROP TRIGGER IF EXISTS trg_nursing_risk_assess_updated ON clinical.nursing_risk_assessments;
CREATE TRIGGER trg_nursing_risk_assess_updated BEFORE UPDATE ON clinical.nursing_risk_assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 预防措施（状态机：suggested -> accepted -> executed，可 cancelled）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.nursing_risk_preventions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES clinical.nursing_risk_assessments(id) ON DELETE CASCADE,
  measure_code  text NOT NULL,
  measure_desc  text NOT NULL,
  status        text NOT NULL DEFAULT 'suggested'
                CHECK (status IN ('suggested','accepted','executed','cancelled')),
  executed_by   uuid REFERENCES iam.users(id),
  executed_at   timestamptz,
  signature     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nursing_risk_prev_assessment
  ON clinical.nursing_risk_preventions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_nursing_risk_prev_status
  ON clinical.nursing_risk_preventions(status);
DROP TRIGGER IF EXISTS trg_nursing_risk_prev_updated ON clinical.nursing_risk_preventions;
CREATE TRIGGER trg_nursing_risk_prev_updated BEFORE UPDATE ON clinical.nursing_risk_preventions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 结局/不良事件登记（皮肤结局：二期及以上压力性损伤；跌倒）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.nursing_risk_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     uuid NOT NULL REFERENCES clinical.visits(id),
  risk_type    text NOT NULL CHECK (risk_type IN ('pressure_ulcer','fall')),
  event_type   text NOT NULL CHECK (event_type IN (
                 'pressure_injury_stage2','pressure_injury_stage3','pressure_injury_stage4','fall')),
  description  text,
  recorded_by  uuid REFERENCES iam.users(id),
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nursing_risk_events_lookup
  ON clinical.nursing_risk_events(visit_id, risk_type);

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('nursing_risk:read',    '护理风险预警只读', 'nursing_risk', '查看压疮/跌倒风险评估、高危看板与结局指标（护士/医生只读）'),
  ('nursing_risk:assess',  '护理风险评估登记', 'nursing_risk', 'Braden/Morse 风险评估登记与预防建议草稿生成（医生/admin）'),
  ('nursing_risk:execute', '护理风险预防执行', 'nursing_risk', '预防措施确认/执行与本人电子签名、结局事件登记（护士/admin）')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：read 授 nurse/doctor/admin；assess 授 doctor/admin；execute 授 nurse/admin
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'nursing_risk:read'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='nursing_risk:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'nursing_risk:assess'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='nursing_risk:assess');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'nursing_risk:execute'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='nursing_risk:execute');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'nursing_risk:read'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='nursing_risk:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'nursing_risk:assess'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='nursing_risk:assess');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'nursing_risk:read'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='nursing_risk:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'nursing_risk:execute'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='nursing_risk:execute');
