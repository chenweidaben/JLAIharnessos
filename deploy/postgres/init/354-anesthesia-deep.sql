-- ============================================================================
-- 健澜科技 jlmedaios · M176-C 医院手术麻醉管理深化（麻醉安全，不走过场）
-- 354-anesthesia-deep.sql
--
-- 【临床核心深化】在 61-surgery.sql 的 clinical.surgery_requests 基础上，
--   把麻醉管理从「有记录」升级为「真安全闭环」：
--
--   术前评估：ASA 分级 / 心功能 / 肺功能 / 麻醉风险分层（五级）；
--   术中监测：生命体征时间线（HR/BP/SpO2/ETCO2）/ 麻醉深度 BIS / 出血量；
--   术后恢复：PACU 滞留时长 / Aldrete / 术后并发症 / NRS 疼痛评分；
--   麻醉质量：麻醉并发症 / 麻醉死亡率 / 非计划二次插管（可上报可追溯）。
--
-- 安全设计：
--   - 所有新列均 ADD COLUMN IF NOT EXISTS，可重入，不破坏 61/190/255 既有数据；
--   - 风险等级 / ASA 分级用 CHECK 白名单约束，杜绝脏数据落库；
--   - 术中监测用 jsonb 存时间线（vitals/bloodLoss），由 BFF 纯函数聚合告警，
--     不做 WebSocket 实时流（本期轮询演示，远期再接推送）；
--   - 质量指标（并发症/死亡/二次插管）落手术单级，科室汇总由 BFF 聚合。
--
-- 幂等：ALTER TABLE ... ADD COLUMN IF NOT EXISTS / ON CONFLICT DO NOTHING。
-- 注释一律全角括号，避免静态校验误判。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 术前评估扩展（ASA 分级 / 心肺功能 / 麻醉风险分层）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.surgery_requests
  ADD COLUMN IF NOT EXISTS asa_grade          text,
  ADD COLUMN IF NOT EXISTS cardiac_function   text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS respiratory_function text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS anesthesia_risk_score numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS anesthesia_risk_level text NOT NULL DEFAULT 'low';

-- ASA 分级：I 正常健康 / II 轻度系统疾患 / III 严重系统疾患 / IV 丧失劳动能力 / V 濒死 / VI 脑死亡器官捐献
ALTER TABLE clinical.surgery_requests
  DROP CONSTRAINT IF EXISTS chk_surgery_asa_grade;
ALTER TABLE clinical.surgery_requests
  ADD CONSTRAINT chk_surgery_asa_grade CHECK (asa_grade IS NULL OR asa_grade IN ('I','II','III','IV','V','VI'));

-- 心功能：normal 正常 / mild 轻度受限 / moderate 中度 / severe 重度
ALTER TABLE clinical.surgery_requests
  DROP CONSTRAINT IF EXISTS chk_surgery_cardiac;
ALTER TABLE clinical.surgery_requests
  ADD CONSTRAINT chk_surgery_cardiac CHECK (cardiac_function IN ('normal','mild','moderate','severe'));

-- 肺功能：normal 正常 / mild 轻度阻塞 / moderate 中度 / severe 重度
ALTER TABLE clinical.surgery_requests
  DROP CONSTRAINT IF EXISTS chk_surgery_respiratory;
ALTER TABLE clinical.surgery_requests
  ADD CONSTRAINT chk_surgery_respiratory CHECK (respiratory_function IN ('normal','mild','moderate','severe'));

-- 麻醉风险分层：low 低 / moderate 中 / high 高 / extreme 极高
ALTER TABLE clinical.surgery_requests
  DROP CONSTRAINT IF EXISTS chk_surgery_risk_level;
ALTER TABLE clinical.surgery_requests
  ADD CONSTRAINT chk_surgery_risk_level CHECK (anesthesia_risk_level IN ('low','moderate','high','extreme'));

COMMENT ON COLUMN clinical.surgery_requests.asa_grade            IS 'ASA 体格状态分级（I-VI），术前麻醉医师评定';
COMMENT ON COLUMN clinical.surgery_requests.cardiac_function     IS '心功能分级：normal/mild/moderate/severe';
COMMENT ON COLUMN clinical.surgery_requests.respiratory_function  IS '肺功能分级：normal/mild/moderate/severe';
COMMENT ON COLUMN clinical.surgery_requests.anesthesia_risk_score IS '麻醉风险评分（0-100，BFF assessAnesthesiaRisk 计算落库）';
COMMENT ON COLUMN clinical.surgery_requests.anesthesia_risk_level IS '麻醉风险分层：low/moderate/high/extreme';

-- ----------------------------------------------------------------------------
-- 术中监测扩展（生命体征时间线 / 麻醉深度 / 出血量）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.surgery_requests
  ADD COLUMN IF NOT EXISTS intraop_monitoring   jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_blood_loss_ml integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_bis              numeric(4,1),
  ADD COLUMN IF NOT EXISTS min_map              numeric(5,1),
  ADD COLUMN IF NOT EXISTS min_spo2            numeric(4,1);

COMMENT ON COLUMN clinical.surgery_requests.intraop_monitoring   IS '术中监测时间线 jsonb：{vitals:[{t,hr,bp,spo2,etco2,bis}], alerts:[...]}';
COMMENT ON COLUMN clinical.surgery_requests.estimated_blood_loss_ml IS '术中估算出血量（ml），>20% 血容量触发告警';
COMMENT ON COLUMN clinical.surgery_requests.min_bis               IS '术中最低 BIS 麻醉深度（<40 过深 / >60 过浅）';
COMMENT ON COLUMN clinical.surgery_requests.min_map               IS '术中最低平均动脉压 mmHg（<60 灌注不足）';
COMMENT ON COLUMN clinical.surgery_requests.min_spo2              IS '术中最低 SpO2 %（<95 低氧）';

-- ----------------------------------------------------------------------------
-- 术后恢复扩展（PACU 时长 / 并发症 / 疼痛评分）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.surgery_requests
  ADD COLUMN IF NOT EXISTS pacu_stay_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pacu_aldrete      integer,
  ADD COLUMN IF NOT EXISTS postop_complications text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pain_score_nrs     integer;

ALTER TABLE clinical.surgery_requests
  DROP CONSTRAINT IF EXISTS chk_surgery_pain_nrs;
ALTER TABLE clinical.surgery_requests
  ADD CONSTRAINT chk_surgery_pain_nrs CHECK (pain_score_nrs IS NULL OR pain_score_nrs BETWEEN 0 AND 10);

COMMENT ON COLUMN clinical.surgery_requests.pacu_stay_minutes IS 'PACU 滞留时长（分钟），>120 提示恢复延迟';
COMMENT ON COLUMN clinical.surgery_requests.pacu_aldrete      IS '出 PACU Aldrete 总分（>=9 方可离室）';
COMMENT ON COLUMN clinical.surgery_requests.postop_complications IS '术后并发症数组：nausea/vomiting/resp_depression/hypertension/arrhythmia 等';
COMMENT ON COLUMN clinical.surgery_requests.pain_score_nrs     IS '术后 NRS 疼痛评分（0-10，>=4 需镇痛干预）';

-- ----------------------------------------------------------------------------
-- 麻醉质量指标（并发症率 / 死亡率 / 非计划二次插管）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.surgery_requests
  ADD COLUMN IF NOT EXISTS anesthesia_complication boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anesthesia_death        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unplanned_reintubation  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anesthesia_quality_grade text NOT NULL DEFAULT 'excellent';

ALTER TABLE clinical.surgery_requests
  DROP CONSTRAINT IF EXISTS chk_surgery_anes_quality;
ALTER TABLE clinical.surgery_requests
  ADD CONSTRAINT chk_surgery_anes_quality CHECK (anesthesia_quality_grade IN ('excellent','good','fair','poor'));

COMMENT ON COLUMN clinical.surgery_requests.anesthesia_complication IS '是否发生麻醉相关并发症（呼吸抑制/误吸/过敏/血流动力学剧烈波动）';
COMMENT ON COLUMN clinical.surgery_requests.anesthesia_death        IS '是否麻醉相关死亡（病例讨论后判定）';
COMMENT ON COLUMN clinical.surgery_requests.unplanned_reintubation IS '术后是否非计划二次插管（脱机失败/上呼吸道梗阻/再全麻）';
COMMENT ON COLUMN clinical.surgery_requests.anesthesia_quality_grade IS '麻醉质量评级：excellent/good/fair/poor（BFF evaluateAnesthesiaQuality 聚合）';

CREATE INDEX IF NOT EXISTS idx_surgery_anesthesia_risk
  ON clinical.surgery_requests(anesthesia_risk_level, anesthesia_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_surgery_anesthesia_quality
  ON clinical.surgery_requests(anesthesia_quality_grade, anesthesia_complication);

-- ----------------------------------------------------------------------------
-- 权限点（幂等）
--   anesthesia_deep:read  查看深度麻醉管理看板（admin / 麻醉科 / 医务部）
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('anesthesia_deep:read', '深度麻醉管理只读', 'anesthesia-deep',
   '查看术前风险评估/术中监测/术后恢复/麻醉质量四维看板')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code = 'anesthesia_deep:read'
ON CONFLICT (role_code, permission_code) DO NOTHING;
