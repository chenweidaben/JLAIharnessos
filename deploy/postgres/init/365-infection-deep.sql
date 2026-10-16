-- ============================================================================
-- 健澜科技 jlmedaios · M179-B 医院院感管理深化（护理院感医保药事）
-- 365-infection-deep.sql
--
-- 院感监测要真预警，不能等暴发。本脚本在 253-infection-monitoring.sql 的
-- clinical.infection_event 之上幂等扩列，把「一条院感风险信号」升级为
-- 「覆盖四大管理维度、可按国家口径统计的院感管理记录」：
--
--   ① 院感监测：手卫生(hand_hygiene_compliant/observed)、
--      环境卫生(env_sample_result)、消毒灭菌(sterilization_result)、
--      多重耐药菌(mdro_strain)；
--   ② 院感病例：诊断(diagnosis_status)、上报(reported)、
--      流调(epi_survey_done)、处置(disposal_action)；
--   ③ 暴发预警：聚集性发病(cluster_count)、同源性(homology)、
--      暴发控制(outbreak_controlled)；
--   ④ 培训考核：院感知识(training_done)、防护技能(protection_skill)、
--      考核合格(exam_passed)。
--
-- 依据：《医院感染管理办法》（卫生部令第48号）、WS/T 312《医院感染监测规范》、
--       WS/T 313《医务人员手卫生规范》、《医院感染暴发报告及处置管理规范》。
--
-- 医疗安全红线（护理院感医保药事）：
--   - 预警仅提示，不自动隔离/停药；最终暴发判定与处置由院感科签认
--     （acknowledged_by）后生效；
--   - AI 不自主下达抗菌药或隔离医嘱，只输出证据链与处置建议。
--
-- 幂等：DO 块判断加列 / CREATE INDEX IF NOT EXISTS / ON CONFLICT DO NOTHING /
--       WHERE NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ---------------------------------------------------------------------------
-- 0. 扩展 clinical.infection_event：挂载院感管理深化字段（幂等加列）
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- ① 院感监测：手卫生观察次数（分母）与规范执行次数（分子）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='clinical' AND table_name='infection_event' AND column_name='hand_hygiene_observed') THEN
    ALTER TABLE clinical.infection_event ADD COLUMN hand_hygiene_observed integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='clinical' AND table_name='infection_event' AND column_name='hand_hygiene_compliant') THEN
    ALTER TABLE clinical.infection_event ADD COLUMN hand_hygiene_compliant integer NOT NULL DEFAULT 0;
  END IF;

  -- 环境卫生学监测结果：pass 合格 / fail 不合格 / pending 待报
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='clinical' AND table_name='infection_event' AND column_name='env_sample_result') THEN
    ALTER TABLE clinical.infection_event ADD COLUMN env_sample_result text
      CHECK (env_sample_result IN ('pass','fail','pending'));
  END IF;

  -- 消毒灭菌效果监测结果：pass / fail / pending
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='clinical' AND table_name='infection_event' AND column_name='sterilization_result') THEN
    ALTER TABLE clinical.infection_event ADD COLUMN sterilization_result text
      CHECK (sterilization_result IN ('pass','fail','pending'));
  END IF;

  -- 多重耐药菌菌株：MRSA / CRE / CRAB / CRPA / VRE / ESBL / unknown
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='clinical' AND table_name='infection_event' AND column_name='mdro_strain') THEN
    ALTER TABLE clinical.infection_event ADD COLUMN mdro_strain text
      CHECK (mdro_strain IN ('MRSA','CRE','CRAB','CRPA','VRE','ESBL','unknown'));
  END IF;

  -- ② 院感病例：诊断结论 confirmed 确诊 / suspected 疑似
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='clinical' AND table_name='infection_event' AND column_name='diagnosis_status') THEN
    ALTER TABLE clinical.infection_event ADD COLUMN diagnosis_status text
      CHECK (diagnosis_status IN ('confirmed','suspected'));
  END IF;

  -- 是否已按时上报内网直报系统（24h 内）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='clinical' AND table_name='infection_event' AND column_name='reported') THEN
    ALTER TABLE clinical.infection_event ADD COLUMN reported boolean NOT NULL DEFAULT false;
  END IF;

  -- 是否已完成流行病学调查
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='clinical' AND table_name='infection_event' AND column_name='epi_survey_done') THEN
    ALTER TABLE clinical.infection_event ADD COLUMN epi_survey_done boolean NOT NULL DEFAULT false;
  END IF;

  -- 处置动作（隔离/终末消毒/针对性抗感染等，留痕）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='clinical' AND table_name='infection_event' AND column_name='disposal_action') THEN
    ALTER TABLE clinical.infection_event ADD COLUMN disposal_action text NOT NULL DEFAULT '';
  END IF;

  -- ③ 暴发预警：72h 窗内同科室聚集病例数
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='clinical' AND table_name='infection_event' AND column_name='cluster_count') THEN
    ALTER TABLE clinical.infection_event ADD COLUMN cluster_count integer NOT NULL DEFAULT 1;
  END IF;

  -- 同源性判定：same 同种同源 / different 菌株不同 / unknown 未分型
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='clinical' AND table_name='infection_event' AND column_name='homology') THEN
    ALTER TABLE clinical.infection_event ADD COLUMN homology text
      CHECK (homology IN ('same','different','unknown'));
  END IF;

  -- 暴发是否已控制（院感科闭环）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='clinical' AND table_name='infection_event' AND column_name='outbreak_controlled') THEN
    ALTER TABLE clinical.infection_event ADD COLUMN outbreak_controlled boolean NOT NULL DEFAULT false;
  END IF;

  -- ④ 培训考核：相关人员是否完成院感知识培训
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='clinical' AND table_name='infection_event' AND column_name='training_done') THEN
    ALTER TABLE clinical.infection_event ADD COLUMN training_done boolean NOT NULL DEFAULT false;
  END IF;

  -- 防护技能（手卫生/穿脱隔离衣/职业暴露处置）是否达标
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='clinical' AND table_name='infection_event' AND column_name='protection_skill') THEN
    ALTER TABLE clinical.infection_event ADD COLUMN protection_skill boolean NOT NULL DEFAULT false;
  END IF;

  -- 院感考核是否合格（≥95 分）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='clinical' AND table_name='infection_event' AND column_name='exam_passed') THEN
    ALTER TABLE clinical.infection_event ADD COLUMN exam_passed boolean NOT NULL DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN clinical.infection_event.hand_hygiene_observed IS
  '【护理院感】手卫生观察时机总数（依从率分母，WS/T 313）';
COMMENT ON COLUMN clinical.infection_event.hand_hygiene_compliant IS
  '【护理院感】手卫生规范执行次数（依从率分子，目标 ≥95%）';
COMMENT ON COLUMN clinical.infection_event.env_sample_result IS
  '【护理院感】环境卫生学监测结果：pass合格/fail不合格/pending待报';
COMMENT ON COLUMN clinical.infection_event.sterilization_result IS
  '【护理院感】消毒灭菌效果监测结果：pass合格/fail不合格/pending待报';
COMMENT ON COLUMN clinical.infection_event.mdro_strain IS
  '【护理院感】多重耐药菌菌株：MRSA/CRE/CRAB/CRPA/VRE/ESBL/unknown';
COMMENT ON COLUMN clinical.infection_event.diagnosis_status IS
  '【护理院感】院感诊断结论：confirmed确诊/suspected疑似';
COMMENT ON COLUMN clinical.infection_event.reported IS
  '【护理院感】是否 24h 内上报内网直报系统（及时上报率分母）';
COMMENT ON COLUMN clinical.infection_event.epi_survey_done IS
  '【护理院感】是否完成流行病学调查（48h 内出流调记录）';
COMMENT ON COLUMN clinical.infection_event.disposal_action IS
  '【护理院感】处置动作留痕：隔离/终末消毒/针对性抗感染/解除隔离';
COMMENT ON COLUMN clinical.infection_event.cluster_count IS
  '【护理院感】72h 窗内同科室聚集病例数（≥3 即聚集预警）';
COMMENT ON COLUMN clinical.infection_event.homology IS
  '【护理院感】同源性：same同种同源/different菌株不同/unknown未分子分型';
COMMENT ON COLUMN clinical.infection_event.outbreak_controlled IS
  '【护理院感】暴发是否已控制（院感科闭环签认）';
COMMENT ON COLUMN clinical.infection_event.training_done IS
  '【护理院感】是否完成院感知识培训（覆盖率 100%）';
COMMENT ON COLUMN clinical.infection_event.protection_skill IS
  '【护理院感】防护技能（手卫生/穿脱隔离衣/职业暴露）是否达标';
COMMENT ON COLUMN clinical.infection_event.exam_passed IS
  '【护理院感】院感考核是否合格（合格率 ≥95%）';

-- ---------------------------------------------------------------------------
-- 统计索引（手卫生依从率 / MDRO / 聚集预警 / 上报及时率报表直读）
-- ---------------------------------------------------------------------------
-- 手卫生依从率：按病区聚合观察/合格数
CREATE INDEX IF NOT EXISTS idx_infection_event_hand_hygiene
  ON clinical.infection_event (ward_code, detected_at DESC)
  WHERE hand_hygiene_observed > 0;
-- MDRO 检出：按菌株 + 时间
CREATE INDEX IF NOT EXISTS idx_infection_event_mdro
  ON clinical.infection_event (mdro_strain, detected_at DESC)
  WHERE mdro_strain IS NOT NULL AND mdro_strain <> 'unknown';
-- 聚集预警：同病区 72h 窗 + 高聚集度
CREATE INDEX IF NOT EXISTS idx_infection_event_cluster
  ON clinical.infection_event (ward_code, cluster_count, detected_at DESC)
  WHERE cluster_count >= 3;
-- 未及时上报清单
CREATE INDEX IF NOT EXISTS idx_infection_event_unreported
  ON clinical.infection_event (detected_at DESC)
  WHERE reported = false AND diagnosis_status = 'confirmed';

-- ---------------------------------------------------------------------------
-- 权限码（幂等）：院感管理深化只读
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('infection_deep:read', '院感管理深化只读', 'infection_deep',
   '查看手卫生依从率/环境卫生消毒灭菌/MDRO/聚集同源预警/院感培训考核（医护/院感科只读）')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等）：read 授 admin/doctor/nurse（全院知晓院感国家口径指标）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM (VALUES ('admin'),('doctor'),('nurse')) AS r(code)
  CROSS JOIN (VALUES ('infection_deep:read')) AS p(code)
 WHERE NOT EXISTS (
   SELECT 1 FROM iam.role_permissions rp
    WHERE rp.role_code = r.code AND rp.permission_code = p.code
 );
