-- ============================================================================
-- 健澜科技 jlmedaios · M131-B 慢病管理助手（高血压/糖尿病/冠心病）
--
-- 【AI能力深化】统一慢病测量记录表 chronic_disease_record：
--   - 一条记录对应一次慢病相关指标测量，disease 标签归属病种；
--   - 高血压：sbp/dbp（控制目标 <140/90 mmHg）
--   - 糖尿病：fasting_glucose（空腹血糖，目标 <7.0 mmol/L）/ hba1c（糖化血红蛋白）
--   - 冠心病（chd）：ldl（低密度脂蛋白胆固醇，目标 <1.8 mmol/L）/ heart_rate（静息心率）
--   - BFF 聚合层据此做「目标值对比 + 风险趋势预测」纯函数计算。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.chronic_disease_record (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       uuid NOT NULL REFERENCES clinical.patients(id),
  disease          text NOT NULL CHECK (disease IN ('hypertension','diabetes','chd')),
  -- 高血压指标
  sbp              int,                 -- 收缩压 mmHg
  dbp              int,                 -- 舒张压 mmHg
  -- 糖尿病指标
  fasting_glucose  numeric,             -- 空腹血糖 mmol/L
  hba1c            numeric,             -- 糖化血红蛋白 %
  -- 冠心病指标
  heart_rate       int,                 -- 静息心率 bpm
  ldl              numeric,             -- 低密度脂蛋白胆固醇 mmol/L
  measured_at      timestamptz NOT NULL DEFAULT now(),
  note             text,
  created_by       uuid NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 患者维度按测量时间倒序，趋势查询主索引
CREATE INDEX IF NOT EXISTS idx_chronic_record_patient_time
  ON clinical.chronic_disease_record(patient_id, measured_at DESC);
-- 病种过滤辅助索引
CREATE INDEX IF NOT EXISTS idx_chronic_record_disease
  ON clinical.chronic_disease_record(patient_id, disease);

-- 患者端查看本人慢病概览复用 143 号脚本下发的 patient_chronic:view 权限，
-- 此处不重复授权；仅在注释中声明 M131-B 复用该权限码。
