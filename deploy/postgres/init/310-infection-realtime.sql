-- ============================================================================
-- 健澜科技 jlmedaios · M153-C 医院感染实时监测（暴发红色预警，不等月报）
--
-- 【临床决策支持】院感指标实时落库：
--   clinical.infection_realtime_alert 统一登记四类院感实时监测指标的暴发预警：
--     ssi     手术部位感染率（SSI：病例数 / 手术台数 ×100%）
--     clabsi  导管相关血流感染率（CLABSI：病例数 / 中心静脉导管留置日 ×1000‰）
--     vap     呼吸机相关肺炎率（VAP：病例数 / 呼吸机使用日 ×1000‰）
--     mdro    多重耐药菌检出率（MDRO：检出株数 / 微生物培养总标本数 ×100%）
--
-- 【核心业务深化】实时触发：超阈值即生成 red_alert=true 红色预警，
--   不等月报、不等季度汇总——院感科大屏即时介入流调与隔离。
--
-- 医疗安全红线：
--  - 预警为辅助监测，最终暴发判定与流调处置由院感科本人确认（acknowledged_by）；
--  - AI 不自动隔离/停药/停手术，只标红提示并推送院感专职人员；
--  - 指标口径 detail 为 jsonb，承载分子/分母原始值，可追溯、可审计。
--
-- 权限码：infection_realtime:read  院感实时监测只读（admin / 院感科）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 【临床决策支持】院感实时暴发预警表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.infection_realtime_alert (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_no        text NOT NULL UNIQUE,
  dept_code       text NOT NULL,
  dept_name       text NOT NULL,
  -- 指标类型：手术部位感染 / 导管相关血流感染 / 呼吸机相关肺炎 / 多重耐药菌
  infection_type  text NOT NULL CHECK (infection_type IN ('ssi','clabsi','vap','mdro')),
  -- 预警等级：red=暴发红色预警（超阈值即触发）/ orange=逼近阈值 / yellow=关注
  alert_level     text NOT NULL DEFAULT 'red'
                  CHECK (alert_level IN ('red','orange','yellow')),
  cases           numeric NOT NULL DEFAULT 0 CHECK (cases >= 0),
  threshold       numeric NOT NULL DEFAULT 0 CHECK (threshold >= 0),
  -- 实测率值（与 rate_unit 配套：% 或 ‰）
  rate_value      numeric NOT NULL DEFAULT 0 CHECK (rate_value >= 0),
  rate_unit       text NOT NULL DEFAULT '%' CHECK (rate_unit IN ('%','‰')),
  -- 统计周期（实时滚动窗口，如 '2026-10-16' 或 '2026-W42'）
  period          text NOT NULL,
  title           text NOT NULL,
  message         text NOT NULL,
  -- 【核心业务深化】超阈值即标红，不等月报
  red_alert       boolean NOT NULL DEFAULT true,
  -- 处置闭环：open -> acknowledged -> closed
  status          text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','acknowledged','closed')),
  -- 分子/分母原始值（可追溯）
  numerator       numeric NOT NULL DEFAULT 0,
  denominator     numeric NOT NULL DEFAULT 0,
  detail          jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at     timestamptz NOT NULL DEFAULT now(),
  acknowledged_by uuid REFERENCES iam.users(id),
  acknowledged_at timestamptz,
  closed_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 大屏检索：按病区 + 指标类型 + 时间倒序
CREATE INDEX IF NOT EXISTS idx_infection_realtime_dept
  ON clinical.infection_realtime_alert(dept_code, detected_at DESC);
-- 红色预警专项检索：只看 open 的 red 预警
CREATE INDEX IF NOT EXISTS idx_infection_realtime_red
  ON clinical.infection_realtime_alert(detected_at DESC)
  WHERE red_alert = true AND status = 'open';
CREATE INDEX IF NOT EXISTS idx_infection_realtime_type
  ON clinical.infection_realtime_alert(infection_type);

DROP TRIGGER IF EXISTS trg_infection_realtime_updated ON clinical.infection_realtime_alert;
CREATE TRIGGER trg_infection_realtime_updated BEFORE UPDATE ON clinical.infection_realtime_alert
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('infection_realtime:read', '院感实时监测只读', 'infection_realtime',
   '查看手术部位感染率/导管相关血流感染率/呼吸机相关肺炎率/多重耐药菌检出率实时大屏与暴发红色预警（admin/院感科）')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：仅 admin / 院感科可见实时监测大屏
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'infection_realtime:read'
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions
  WHERE role_code = 'admin' AND permission_code = 'infection_realtime:read'
);
