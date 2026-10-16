-- ============================================================================
-- 健澜科技 jlmedaios · M177-B 医院统计上报深化（国家口径，不凑数）
--
-- 统计上报必须对齐国家口径，禁止拍脑袋凑数：
--   国家质控数据上报：病案首页 / DRG / DIP / 单病种（国卫办病案首页质控口径）；
--   医院年报：门诊量 / 住院量 / 手术量 / 收入（卫生健康统计年报口径）；
--   绩效考核上报：国家三级公立医院绩效考核「国考」20 项指标口径；
--   院感上报：院感病例 / 暴发事件（院感直报口径）。
--
-- 表说明：
--   clinical.stat_report  一次统计上报的归档：按 report_type + period 唯一，
--                         payload 为按国家口径汇总后的结构化数据（jsonb），
--                         validation 记录校验结论（errors/warnings），
--                         status 机：draft -> validating -> submitted -> accepted。
--
-- 医疗安全红线：
--  - 上报数据由业务系统按国家口径归集，纯函数校验不通过不得 submitted；
--  - 病案/设备/耗材口径在注释中标注；上报动作留审计链（audit schema）；
--  - 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT，可重入。
--
-- 权限码：stat_report:view    只读（统计/医务/admin）；
--         stat_report:submit 上报提交（医务科/admin）。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.stat_report (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_no      text NOT NULL UNIQUE,
  -- 上报类型：national_qc 国家质控 / hospital_annual 医院年报 /
  --           performance 国考绩效 / infection 院感上报
  report_type    text NOT NULL CHECK (report_type IN
                   ('national_qc','hospital_annual','performance','infection')),
  -- 子类别：病案首页/DRG/DIP/单病种；门诊/住院/手术/收入；国考20项；院感病例/暴发事件
  sub_type       text NOT NULL DEFAULT '',
  -- 统计期：年报 YYYY；月报 YYYY-MM；院感事件可 YYYY-Www 或具体事件期
  period         text NOT NULL,
  -- 上报主体口径版本（病案/设备/耗材口径随国家版本演进）
  caliber_version text NOT NULL DEFAULT 'national-2026',
  -- 按国家口径汇总后的结构化数据（病案首页/DRG/DIP/手术量/收入/国考指标/院感病例）
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 校验结论：valid / errors[] / warnings[]，未过校验不得 submitted
  validation     jsonb NOT NULL DEFAULT '{"valid":false,"errors":[],"warnings":[]}'::jsonb,
  -- 状态机：draft -> validating -> submitted -> accepted
  status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','validating','submitted','accepted','rejected')),
  batch_no       text,
  note           text,
  submitted_by   uuid REFERENCES iam.users(id),
  submitted_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_type, sub_type, period)
);

CREATE INDEX IF NOT EXISTS idx_stat_report_lookup
  ON clinical.stat_report(report_type, period DESC, status);
CREATE INDEX IF NOT EXISTS idx_stat_report_status
  ON clinical.stat_report(status, submitted_at DESC);

DROP TRIGGER IF EXISTS trg_stat_report_updated ON clinical.stat_report;
CREATE TRIGGER trg_stat_report_updated BEFORE UPDATE ON clinical.stat_report
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
