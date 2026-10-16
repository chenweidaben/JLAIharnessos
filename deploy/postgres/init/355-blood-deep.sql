-- ============================================================================
-- 健澜科技 jlmedaios · M176-D 医院输血管理深化——零差错四阶段（临床核心深化）
-- 355-blood-deep.sql
--
-- 目标：在 M10-A clinical.blood_transfusion_requests / blood_transfusions /
--   blood_transfusion_reactions 业务闭环之上，新增「深度输血台账」
--   clinical.blood_transfusion_deep，把输血从「流程跑通」升级为四阶段零差错管控：
--
--     · 输血适应症：hb / plt / inr / aptt / fibrinogen / 休克指数 / 失血量；
--     · 输血前评估：abo_rhd / crossmatch_result / antibody_screen / infection_panel；
--     · 输血过程：drip_rate_ml_hr / reaction_type / reaction_severity / stopped_at；
--     · 输血后评价：pre_post_hb / effect_grade / met_expected / cost_cny。
--
-- 设计边界：
--   - 本台账为「深化留痕」表，不替换 M10-A 既有业务表；
--   - 患者仅存脱敏标识 patient_ref（P-xxxx），不落 PII；
--   - BFF 纯函数（bloodDeepAggregator）内置演示台账与本种子对齐，空库可演示；
--   - 不碰 WebSocket；不新增依赖。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. 深度输血台账：clinical.blood_transfusion_deep
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.blood_transfusion_deep (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 脱敏患者与就诊
  patient_ref            text    NOT NULL DEFAULT 'P-DEMO',
  visit_id               uuid,
  -- 阶段一：输血适应症
  indication_level       text    NOT NULL DEFAULT 'elective',   -- none/elective/urgent/contraindicated
  component              text    NOT NULL DEFAULT 'rbc',        -- rbc/platelet/plasma/cryoprecipitate/wb/none
  units                  numeric(6,1) NOT NULL DEFAULT 0,
  hb_pre                 numeric(5,1),
  plt_pre                numeric(6,1),
  inr                    numeric(4,2),
  aptt_sec               numeric(5,1),
  fibrinogen             numeric(4,2),
  estimated_blood_loss_ml integer NOT NULL DEFAULT 0,
  shock_index            numeric(3,2),
  -- 阶段二：输血前评估
  abo_rhd                text,                                  -- A+/O-/AB- 等
  crossmatch_result      text,                                  -- compatible/major_positive/minor_positive
  antibody_screen        text,                                  -- negative/positive
  infection_panel_ok     boolean NOT NULL DEFAULT false,        -- 输血前九项留痕
  consent_signed        boolean NOT NULL DEFAULT false,        -- 知情同意
  -- 阶段三：输血过程
  drip_rate_ml_hr        integer NOT NULL DEFAULT 120,
  started_at             timestamptz,
  stopped_at             timestamptz,
  reaction_type          text    NOT NULL DEFAULT 'none',       -- none/acute_hemolytic/febrile_allergic/sepsis/taco/trali/hypotension
  reaction_severity      text    NOT NULL DEFAULT 'none',       -- none/mild/moderate/severe
  fatal                  boolean NOT NULL DEFAULT false,
  -- 阶段四：输血后评价
  hb_post                numeric(5,1),
  plt_post               numeric(6,1),
  effect_grade            text    NOT NULL DEFAULT 'unknown',    -- excellent/effective/ineffective/unknown
  met_expected           boolean NOT NULL DEFAULT false,
  estimated_cost_cny    numeric(10,2) NOT NULL DEFAULT 0,
  -- 留痕
  note                   text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- 收紧取值域（幂等 DROP + ADD）
ALTER TABLE clinical.blood_transfusion_deep
  DROP CONSTRAINT IF EXISTS blood_deep_indication_check,
  ADD CONSTRAINT blood_deep_indication_check CHECK (indication_level IN
    ('none','elective','urgent','contraindicated')),
  DROP CONSTRAINT IF EXISTS blood_deep_component_check,
  ADD CONSTRAINT blood_deep_component_check CHECK (component IN
    ('none','rbc','platelet','plasma','cryoprecipitate','wb')),
  DROP CONSTRAINT IF EXISTS blood_deep_reaction_type_check,
  ADD CONSTRAINT blood_deep_reaction_type_check CHECK (reaction_type IN
    ('none','acute_hemolytic','febrile_allergic','sepsis','taco','trali','hypotension')),
  DROP CONSTRAINT IF EXISTS blood_deep_severity_check,
  ADD CONSTRAINT blood_deep_severity_check CHECK (reaction_severity IN
    ('none','mild','moderate','severe')),
  DROP CONSTRAINT IF EXISTS blood_deep_effect_check,
  ADD CONSTRAINT blood_deep_effect_check CHECK (effect_grade IN
    ('excellent','effective','ineffective','unknown'));

-- 索引：按患者/反应严重度/疗效评价快速质控统计
CREATE INDEX IF NOT EXISTS idx_blood_deep_patient
  ON clinical.blood_transfusion_deep(patient_ref, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blood_deep_reaction
  ON clinical.blood_transfusion_deep(reaction_severity) WHERE reaction_severity <> 'none';
CREATE INDEX IF NOT EXISTS idx_blood_deep_effect
  ON clinical.blood_transfusion_deep(effect_grade);

-- ---------------------------------------------------------------------------
-- 2. 权限码（幂等）：输血深化只读看板
-- ---------------------------------------------------------------------------
INSERT INTO auth.permission (code, name, description)
VALUES
  ('blood:deep:view', '输血深化查看', '查看输血管理四阶段零差错质控看板')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. 演示种子（与 bloodDeepAggregator 内置台账对齐，空库可演示）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.blood_transfusion_deep
  (patient_ref, indication_level, component, units, hb_pre, hb_post, plt_pre, plt_post,
   estimated_blood_loss_ml, shock_index, abo_rhd, crossmatch_result, antibody_screen,
   infection_panel_ok, consent_signed, drip_rate_ml_hr, reaction_type, reaction_severity,
   effect_grade, met_expected, estimated_cost_cny, note)
VALUES
  ('P-1001', 'urgent', 'wb', 6, 58, 82, 90, 120, 1500, 1.34, 'A+', 'compatible', 'negative',
   true, true, 150, 'none', 'none', 'effective', true, 1500,
   '急诊失血性休克 MTP，RBC:血浆:血小板≈1:1:1'),
  ('P-1002', 'elective', 'rbc', 2, 62, 78, 210, 215, 0, 0.62, 'O-', 'compatible', 'negative',
   true, true, 120, 'febrile_allergic', 'mild', 'excellent', true, 440,
   '术后慢性贫血，轻度发热反应，减慢滴速后缓解'),
  ('P-1003', 'elective', 'platelet', 1, 90, 92, 18, 45, 0, 0.70, 'B+', 'compatible', 'positive',
   true, true, 100, 'none', 'none', 'effective', true, 1400,
   '化疗后血小板减少，抗体阳性，选用洗涤血小板'),
  ('P-1004', 'contraindicated', 'none', 0, 96, 96, 180, 180, 0, 0.66, 'AB-', 'compatible', 'negative',
   true, true, 0, 'none', 'none', 'unknown', false, 0,
   'Hb≥96 g/L 无症状，无输血指征，记录观察')
ON CONFLICT DO NOTHING;
