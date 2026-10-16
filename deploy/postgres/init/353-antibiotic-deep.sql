-- ============================================================================
-- 健澜科技 jlmedaios · M176-B 医院抗菌药物管理深化（临床核心深化）
-- 353-antibiotic-deep.sql
--
-- 抗菌药物管理要国家口径：国卫办医发〔2015〕42 号《抗菌药物临床应用指导原则
-- （2015 年版）》，配套全国抗菌药物临床应用专项整治活动指标：
--
--   ① 抗菌药物分级管理：非限制使用级 / 限制使用级 / 特殊使用级，
--      特殊使用级须会诊审批后使用，不得在门诊使用；
--   ② 使用率监测：门诊 ≤20%、住院 ≤60%、I 类切口预防用药率 ≤30%；
--   ③ 使用强度：抗菌药物使用强度（AUD）≤ 40 DDDs/100 人天；
--   ④ 微生物送检率：治疗性使用前送检率 ≥30%，其中接受限制使用级治疗的
--      患者 ≥50%、接受特殊使用级治疗的患者 ≥80%；
--   ⑤ 合理性评价：适应症 / 选药 / 剂量 / 疗程 / 围术期时机逐项点评，
--      点评结果由药师签名后生效。
--
-- 本脚本在 20-clinical.sql 的 clinical.prescriptions 之上幂等扩列，
-- 把「一张处方」升级为「一条可按国家口径统计的抗菌药物管理记录」。
--
-- 医疗安全红线（临床核心深化）：
--   - AI 不自主开具抗菌药物；特殊使用级必须先有会诊审批（special_approved=true）；
--   - 治疗性使用未送检即记录在案，纳入送检率分母自动扣分；
--   - 合理性评价为辅助判定，最终结论由药师（reviewed_by）签名确认。
--
-- 幂等：DO 块判断加列 / CREATE INDEX IF NOT EXISTS / ON CONFLICT DO NOTHING /
--       WHERE NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ---------------------------------------------------------------------------
-- 0. 扩展 clinical.prescriptions：挂载抗菌药物管理深化字段（幂等加列）
--    「临床核心深化」——每张抗菌药处方都可按国卫办医发〔2015〕42 号口径统计。
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- 是否抗菌药物处方（非抗菌药处方其余列保持默认空值）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'is_antibiotic'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN is_antibiotic boolean NOT NULL DEFAULT false;
  END IF;

  -- 抗菌药物分级：unrestricted 非限制使用级 / restricted 限制使用级 / special 特殊使用级
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'abx_level'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN abx_level text
      CHECK (abx_level IN ('unrestricted', 'restricted', 'special'));
  END IF;

  -- 使用目的：therapeutic 治疗性 / prophylactic 预防性（围术期）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'abx_purpose'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN abx_purpose text
      CHECK (abx_purpose IN ('therapeutic', 'prophylactic'));
  END IF;

  -- DDD（Defined Daily Dose）：WHO 限定日剂量，单位 g/日，用于 DDDs 计算
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'ddd'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN ddd numeric(10,3);
  END IF;

  -- 周期内累计消耗量（g）：DDDs = total_amount_g / ddd
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'total_amount_g'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN total_amount_g numeric(12,3) NOT NULL DEFAULT 0;
  END IF;

  -- DDDs（用药频度）= total_amount_g / ddd，落库便于报表直读
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'ddds'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN ddds numeric(12,2) NOT NULL DEFAULT 0;
  END IF;

  -- 治疗性使用前是否已送微生物培养（送检率分子依据）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'culture_sent'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN culture_sent boolean NOT NULL DEFAULT false;
  END IF;

  -- 培养结果：pending 待报 / positive 阳性 / negative 阴性 / none 未做
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'culture_result'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN culture_result text NOT NULL DEFAULT 'none'
      CHECK (culture_result IN ('none', 'pending', 'positive', 'negative'));
  END IF;

  -- 是否有明确适应症（无指征用药 = 不合理核心项）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'has_indication'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN has_indication boolean NOT NULL DEFAULT false;
  END IF;

  -- 手术切口分类（围术期预防用药点评用）：I 清洁 / II 清洁-污染 / III 污染
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'incision_class'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN incision_class text
      CHECK (incision_class IN ('I', 'II', 'III'));
  END IF;

  -- 围术期给药时机：切皮前给药距切皮分钟数（国口径 0.5~1h，即 30~60 分钟）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'peri_timing_min'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN peri_timing_min integer;
  END IF;

  -- 围术期预防用药疗程（小时）：通常 ≤24h，必要时 ≤48h
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'peri_duration_h'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN peri_duration_h numeric(8,2);
  END IF;

  -- 合理性评价结论：rational 合理 / irrational 不合理（药师签名后生效）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'rationality_verdict'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN rationality_verdict text
      CHECK (rationality_verdict IN ('rational', 'irrational'));
  END IF;

  -- 不合理项明细：[{code,severity,message}]（适应症/选药/剂量/疗程/送检/时机）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'rationality_issues'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN rationality_issues jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  -- 特殊使用级会诊审批是否通过（特殊使用级未审批不得使用）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'special_approved'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN special_approved boolean NOT NULL DEFAULT false;
  END IF;

  -- 合理性评价药师签名人（AI 评价为辅助，最终结论须药师签认）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'prescriptions'
      AND column_name = 'abx_reviewed_by'
  ) THEN
    ALTER TABLE clinical.prescriptions
      ADD COLUMN abx_reviewed_by text NOT NULL DEFAULT '';
  END IF;
END $$;

COMMENT ON COLUMN clinical.prescriptions.is_antibiotic IS
  '【临床核心深化】是否抗菌药物处方（国卫办医发〔2015〕42号口径统计入口）';
COMMENT ON COLUMN clinical.prescriptions.abx_level IS
  '【临床核心深化】抗菌药物分级：unrestricted非限制/restricted限制/special特殊使用级';
COMMENT ON COLUMN clinical.prescriptions.abx_purpose IS
  '【临床核心深化】使用目的：therapeutic治疗性/prophylactic预防性（送检率按治疗性统计）';
COMMENT ON COLUMN clinical.prescriptions.ddd IS
  '【临床核心深化】WHO 限定日剂量 DDD（g/日），DDDs = 消耗量(g)/DDD';
COMMENT ON COLUMN clinical.prescriptions.total_amount_g IS
  '【临床核心深化】周期累计消耗量（g），DDDs 计算分子';
COMMENT ON COLUMN clinical.prescriptions.ddds IS
  '【临床核心深化】用药频度 DDDs；AUD = DDDs/同期人天×100（国口径 ≤40）';
COMMENT ON COLUMN clinical.prescriptions.culture_sent IS
  '【临床核心深化】治疗性使用前是否送微生物培养（送检率分子：治疗性≥30%，限制级≥50%，特殊级≥80%）';
COMMENT ON COLUMN clinical.prescriptions.culture_result IS
  '【临床核心深化】培养结果：none未做/pending待报/positive阳性/negative阴性';
COMMENT ON COLUMN clinical.prescriptions.has_indication IS
  '【临床核心深化】有无明确适应症（无指征用药 = 不合理核心项）';
COMMENT ON COLUMN clinical.prescriptions.incision_class IS
  '【临床核心深化】手术切口分类 I/II/III（I类切口预防用药率国口径≤30%）';
COMMENT ON COLUMN clinical.prescriptions.peri_timing_min IS
  '【临床核心深化】切皮前给药距切皮分钟数（国口径 30~60 分钟，剖宫产断脐后给药）';
COMMENT ON COLUMN clinical.prescriptions.peri_duration_h IS
  '【临床核心深化】围术期预防用药疗程（h）：通常≤24h，必要时≤48h，>48h 判不合理';
COMMENT ON COLUMN clinical.prescriptions.rationality_verdict IS
  '【临床核心深化】合理性评价结论：rational合理/irrational不合理（药师签名后生效）';
COMMENT ON COLUMN clinical.prescriptions.rationality_issues IS
  '【临床核心深化】不合理项明细：适应症/选药/剂量/疗程/送检/时机，[{code,severity,message}]';
COMMENT ON COLUMN clinical.prescriptions.special_approved IS
  '【临床核心深化】特殊使用级会诊审批是否通过（未审批不得使用，AI 不自主开方）';
COMMENT ON COLUMN clinical.prescriptions.abx_reviewed_by IS
  '【临床核心深化】合理性评价药师签名人（AI 评价为辅助，最终以药师签认为准）';

-- ---------------------------------------------------------------------------
-- 统计索引（国口径五率一强度报表直读，部分索引带过滤条件缩小扫描面）
-- ---------------------------------------------------------------------------
-- 门诊/住院使用率：按就诊类型 + 是否抗菌药聚合（处方创建时间序）
CREATE INDEX IF NOT EXISTS idx_rx_abx_level
  ON clinical.prescriptions (abx_level, created_at DESC)
  WHERE is_antibiotic = true;
-- 治疗性使用送检率：治疗性处方 × 是否送检
CREATE INDEX IF NOT EXISTS idx_rx_abx_culture
  ON clinical.prescriptions (abx_purpose, culture_sent, created_at DESC)
  WHERE is_antibiotic = true AND abx_purpose = 'therapeutic';
-- 围术期预防用药点评：预防用药处方按切口分类聚合
CREATE INDEX IF NOT EXISTS idx_rx_abx_peri
  ON clinical.prescriptions (abx_purpose, incision_class, created_at DESC)
  WHERE is_antibiotic = true AND abx_purpose = 'prophylactic';
-- 不合理处方清单：合理性点评为 irrational 的处方
CREATE INDEX IF NOT EXISTS idx_rx_abx_irrational
  ON clinical.prescriptions (rationality_verdict, created_at DESC)
  WHERE is_antibiotic = true AND rationality_verdict = 'irrational';

-- ---------------------------------------------------------------------------
-- 权限码（幂等）：抗菌药物管理深化只读
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('antibiotic_deep:read', '抗菌药物管理深化只读', 'antibiotic_deep',
   '查看抗菌药物分级管理/五率一强度/微生物送检率/处方合理性评价（医护/药师只读）')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等）：read 授 admin/doctor/nurse/pharmacist（全院知晓国家口径指标）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM (VALUES ('admin'),('doctor'),('nurse'),('pharmacist')) AS r(code)
  CROSS JOIN (VALUES ('antibiotic_deep:read')) AS p(code)
 WHERE NOT EXISTS (
   SELECT 1 FROM iam.role_permissions rp
    WHERE rp.role_code = r.code AND rp.permission_code = p.code
 );
