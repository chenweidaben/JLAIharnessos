-- ============================================================================
-- 健澜科技 jlmedaios · M141-D 医院感染控制深化（实时上报 / 聚集追踪 / 月报）
--
-- 【质量与安全】核心诉求：实时预警，不能等爆发了才发现。
--   clinical.infection_control_event 登记每一例院感上报事件（护士/医生/微生物科
--   一线随手报），系统按「同科室 + 同类型 + 24h 内 ≥2 例」自动触发聚集预警，
--   院感科在暴发前即介入流调与隔离处置。
--
-- 四类院感监测指标（国家院感质控口径）：
--   ssi    手术部位感染率          = SSI 例数 / 手术台次
--   clabsi 导管相关血流感染率      = CLABSI 例数 / 中心静脉导管日
--   vap    呼吸机相关肺炎率        = VAP 例数 / 机械通气日
--   mdro   多重耐药菌检出率        = MDRO 检出例数 / 住院日（千日）
--
-- 与 M130-B（253-infection-monitoring.sql，clinical.infection_event 风险信号）
-- 分工：253 管「系统识别的聚集风险信号」，本表单列「人工上报的确诊/疑似院感事件」，
--   二者互补、互不覆盖，故独立建表 clinical.infection_control_event。
--
-- 医疗安全红线：
--  - 自动预警仅提示，不自动隔离/停药；最终处置由院感科 ack 闭环（acknowledged_by）；
--  - patient_id 为内部编码，detail jsonb 承载菌株/导管/手术等原始信号，可追溯；
--  - 不触碰 WebSocket：拉取式 REST 实时查询即可满足「实时预警」时效。
--
-- 权限码：infection_control:read（只读）/ infection_control:report（上报）。
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ---------------------------------------------------------------------------
-- 【质量与安全】院感上报事件表（每报一例即落库一例）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.infection_control_event (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_no        text NOT NULL UNIQUE,
  -- 患者内部编码（不含 PII）
  patient_id      text NOT NULL,
  -- 上报科室（同科室聚集判定维度）
  dept_code       text NOT NULL,
  dept_name       text NOT NULL,
  -- 四类院感监测指标
  infection_type  text NOT NULL CHECK (infection_type IN ('ssi','clabsi','vap','mdro')),
  -- 上报来源：nurse 护士 / doctor 医生 / microbiology 微生物科 / surveillance 专职人员 / other
  source          text NOT NULL DEFAULT 'nurse',
  -- 【质量与安全】同科室同类型 24h 内 ≥2 例 → 自动预警标红
  auto_alert      boolean NOT NULL DEFAULT false,
  -- 原始信号：菌株名/导管类型/手术名称/通气时长等
  detail          jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 事件发生/上报时间（聚集 24h 窗与月报按此切片）
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  -- 院感科闭环确认（ack 责任留痕）
  acknowledged_by uuid REFERENCES iam.users(id),
  acknowledged_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.infection_control_event IS
  '【质量与安全】M141-D 院感上报事件：同科室同类型24h内≥2例自动预警，实时阻断暴发';
COMMENT ON COLUMN clinical.infection_control_event.auto_alert IS
  '同科室同类型 24h 窗内累计 ≥2 例即自动标红（实时预警，不等暴发）';
COMMENT ON COLUMN clinical.infection_control_event.infection_type IS
  'ssi=手术部位感染 clabsi=导管相关血流感染 vap=呼吸机相关肺炎 mdro=多重耐药菌';

-- 聚集追踪核心索引：同科室 + 同类型 + 时间倒序（24h 窗查询走此索引）
CREATE INDEX IF NOT EXISTS idx_infection_control_dept_type_time
  ON clinical.infection_control_event (dept_code, infection_type, occurred_at DESC);

-- 自动预警看板：仅拉 auto_alert=true 的待处置事件
CREATE INDEX IF NOT EXISTS idx_infection_control_alert
  ON clinical.infection_control_event (occurred_at DESC)
  WHERE auto_alert = true;

-- 月报：按发生月切片
CREATE INDEX IF NOT EXISTS idx_infection_control_occurred
  ON clinical.infection_control_event (occurred_at DESC);

DROP TRIGGER IF EXISTS trg_infection_control_event_updated ON clinical.infection_control_event;
CREATE TRIGGER trg_infection_control_event_updated BEFORE UPDATE ON clinical.infection_control_event
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('infection_control:read',   '院感控制只读', 'infection_control',
   '查看院感上报事件台账、聚集预警与月报（admin/院感科）'),
  ('infection_control:report', '院感事件上报', 'infection_control',
   '一线上报手术部位/导管相关血流/呼吸机相关肺炎/多重耐药菌感染事件')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：admin 可读可报，院感科后续按需追加
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', p.code
FROM (VALUES ('infection_control:read'), ('infection_control:report')) AS p(code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.role_code = 'admin' AND rp.permission_code = p.code
);
