-- ============================================================================
-- 健澜科技 jlmedaios · M130-B 院感监测预警（发热聚集 / SSI / 耐药菌 / VAP）
--
-- 【核心业务深化】院感实时预警事件落库：
--   clinical.infection_event 统一登记四类院感风险事件：
--     fever_cluster  发热患者聚集（同病区 72h 内 ≥3 例 ≥38.0℃）
--     ssi            手术部位感染（术后 30 天窗内切口感染征象）
--     mdro           耐药菌检出（MRSA / CRE / CRAB / VRE / ESBL）
--     vap            呼吸机相关肺炎（有创通气 ≥48h 后新发肺部感染）
--
-- 风险分级：low(散发) / medium(聚集预警) / high(暴发风险) / critical(暴发确认)；
--   发现 high/critical 立即在管理驾驶舱标红（redAlert=true），院感科闭环确认。
--
-- 医疗安全红线：
--  - 预警为辅助监测，最终暴发判定与流调处置由院感科本人确认（acknowledged_by）；
--  - AI 不自动隔离/停药，只标红提示并推送院感专职人员；
--  - 事件明细 detail 为 jsonb，承载体温/切口/菌株/通气时长等原始信号，可追溯。
--
-- 权限码：infection_alerts:read  院感预警只读（admin / 院感科）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 【核心业务深化】院感监测预警事件表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.infection_event (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_no        text NOT NULL UNIQUE,
  ward_code       text NOT NULL,
  ward_name       text NOT NULL,
  visit_id        uuid REFERENCES clinical.visits(id),
  event_type      text NOT NULL CHECK (event_type IN ('fever_cluster','ssi','mdro','vap')),
  risk_level      text NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  patient_count   int  NOT NULL DEFAULT 1 CHECK (patient_count >= 1),
  detail          jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at     timestamptz NOT NULL DEFAULT now(),
  acknowledged_by uuid REFERENCES iam.users(id),
  acknowledged_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 预警看板：按病区 + 分级 + 时间检索
CREATE INDEX IF NOT EXISTS idx_infection_event_ward
  ON clinical.infection_event(ward_code, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_infection_event_level
  ON clinical.infection_event(risk_level)
  WHERE risk_level IN ('high','critical');
CREATE INDEX IF NOT EXISTS idx_infection_event_type
  ON clinical.infection_event(event_type);

DROP TRIGGER IF EXISTS trg_infection_event_updated ON clinical.infection_event;
CREATE TRIGGER trg_infection_event_updated BEFORE UPDATE ON clinical.infection_event
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('infection_alerts:read', '院感监测预警只读', 'infection_monitoring',
   '查看发热聚集/手术部位感染/耐药菌/呼吸机相关肺炎风险病区红色预警（admin/院感科）')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：仅 admin 可见红色预警驾驶舱
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'infection_alerts:read'
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions
  WHERE role_code = 'admin' AND permission_code = 'infection_alerts:read'
);
