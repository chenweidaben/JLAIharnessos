-- ============================================================================
-- 健澜科技 jlmedaios — M153-A 临床路径智能推荐（临床决策支持 CDS）
--
-- clinical_pathway 主表：结构化路径字典（病种 / 亚型 / 标准住院日 / 按天步骤 / 基准费用）。
-- 配套：
--   * clinical_pathway_recommendation —— 一次推荐留痕（就诊、输入病种、年龄、共病、命中路径）；
--   * clinical_pathway_deviation      —— 医师实际执行与推荐路径的偏离记录。
--
-- 合规红线：
--   * 路径为【推荐】而非强制：is_mandated 默认 FALSE，医师可根据实际情况偏离；
--   * recommended_by = 'cds_engine' 仅表示临床决策支持引擎产出，不替代医师判断；
--   * confidence 为匹配置信度（0-1），仅供医师参考；
--   * estimated_cost_cny 为医保基准概算，非收费依据。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 路径字典主表
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.clinical_pathway (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_code         text NOT NULL UNIQUE,
  -- 病种大类：coronary_heart_disease / pneumonia / diabetes_mellitus / cholecystectomy
  disease_category     text NOT NULL,
  -- 亚型：stent / medical / cap / hap / type2 / gestational / laparoscopic / open
  subtype              text NOT NULL,
  pathway_name         text NOT NULL,
  icd_code             text,
  standard_los_days    integer NOT NULL DEFAULT 7 CHECK (standard_los_days > 0),
  -- 按天步骤结构化：[{"day":1,"name":"入院评估","action":"..."}, ...]
  steps                jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 基准费用分解：[{"name":"床位费","amountCny":600}, ...]
  cost_breakdown       jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_cost_cny   numeric(12,2) NOT NULL DEFAULT 0 CHECK (estimated_cost_cny >= 0),
  -- 【临床决策支持】路径为推荐而非强制
  is_mandated          boolean NOT NULL DEFAULT false,
  evidence_level       text NOT NULL DEFAULT 'expert_consensus',
  version              text NOT NULL DEFAULT 'v1.0',
  active               boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (disease_category, subtype)
);

CREATE INDEX IF NOT EXISTS idx_clinical_pathway_category
  ON clinical.clinical_pathway(disease_category, active);
CREATE INDEX IF NOT EXISTS idx_clinical_pathway_code
  ON clinical.clinical_pathway(pathway_code);

-- ----------------------------------------------------------------------------
-- 2. 推荐留痕表
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.clinical_pathway_recommendation (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id             uuid,
  patient_id           uuid,
  input_disease        text NOT NULL DEFAULT '',
  patient_age          integer CHECK (patient_age IS NULL OR patient_age >= 0 AND patient_age <= 130),
  comorbidities        jsonb NOT NULL DEFAULT '[]'::jsonb,
  pathway_id           uuid REFERENCES clinical.clinical_pathway(id),
  confidence           numeric(4,3) CHECK (confidence IS NULL OR confidence >= 0 AND confidence <= 1),
  rationale            jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- CDS 引擎产出，不替代医师判断
  recommended_by       text NOT NULL DEFAULT 'cds_engine',
  doctor_deviated      boolean NOT NULL DEFAULT false,
  deviation_reason     text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_reco_visit
  ON clinical.clinical_pathway_recommendation(visit_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. 路径偏离记录表
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.clinical_pathway_deviation (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id    uuid REFERENCES clinical.clinical_pathway_recommendation(id),
  visit_id             uuid,
  pathway_id           uuid REFERENCES clinical.clinical_pathway(id),
  expected_step        text NOT NULL DEFAULT '',
  actual_action        text NOT NULL DEFAULT '',
  deviation_type       text NOT NULL DEFAULT 'clinical_judgement'
                       CHECK (deviation_type IN ('clinical_judgement','complication','patient_preference','diagnosis_revision','contraindication')),
  note                 text,
  recorded_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_deviation_visit
  ON clinical.clinical_pathway_deviation(visit_id, pathway_id);

-- ----------------------------------------------------------------------------
-- 4. 更新时间戳触发器
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_clinical_pathway_updated ON clinical.clinical_pathway;
CREATE TRIGGER trg_clinical_pathway_updated BEFORE UPDATE ON clinical.clinical_pathway
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. 种子：覆盖病种路径字典（可重复执行，按 pathway_code upsert）
-- ----------------------------------------------------------------------------
INSERT INTO clinical.clinical_pathway
  (pathway_code, disease_category, subtype, pathway_name, icd_code,
   standard_los_days, steps, cost_breakdown, estimated_cost_cny, evidence_level)
VALUES
  ('CHD-PCI', 'coronary_heart_disease', 'stent',
   '冠心病（急性冠脉综合征）PCI支架置入临床路径', 'I21.4', 5,
   '[{"day":1,"name":"入院评估","action":"心电图/心肌酶/BNP，术前谈话与知情同意"},
     {"day":1,"name":"介入手术","action":"冠脉造影，必要时PCI支架置入"},
     {"day":2,"name":"术后监护","action":"穿刺部位护理、心电血压监护，启动双联抗血小板"},
     {"day":3,"name":"二级预防","action":"危险因素评估，β受体阻滞剂/他汀/ACEI滴定"},
     {"day":5,"name":"出院","action":"出院指导（DAPT 12个月），心内科门诊随访"}]'::jsonb,
   '[{"name":"床位费","amountCny":600},{"name":"检查费","amountCny":1800},
     {"name":"药品费","amountCny":2200},{"name":"手术操作费","amountCny":9000},
     {"name":"耗材费(支架)","amountCny":12000},{"name":"护理费","amountCny":900}]'::jsonb,
   26500, 'guideline_2023'),
  ('CHD-MED', 'coronary_heart_disease', 'medical',
   '冠心病（稳定型/高出血风险）药物保守治疗临床路径', 'I25.1', 7,
   '[{"day":1,"name":"入院评估","action":"心电图/心肌酶/心脏超声，危险分层"},
     {"day":2,"name":"抗缺血治疗","action":"硝酸酯+β受体阻滞剂，必要时抗凝"},
     {"day":4,"name":"风险复核","action":"评估是否具备介入指征，多学科会诊"},
     {"day":6,"name":"心脏康复","action":"运动耐量评估与康复指导"},
     {"day":7,"name":"出院","action":"二级预防用药处方，社区随访"}]'::jsonb,
   '[{"name":"床位费","amountCny":840},{"name":"检查费","amountCny":1500},
     {"name":"药品费","amountCny":3500},{"name":"操作费(造影可选)","amountCny":3000},
     {"name":"护理费","amountCny":1000}]'::jsonb,
   9840, 'guideline_2023'),
  ('PNEUM-CAP', 'pneumonia', 'cap',
   '社区获得性肺炎（CAP）临床路径', 'J15.9', 7,
   '[{"day":1,"name":"入院评估","action":"血常规/CRP/PCT/胸部CT，CURB-65评分"},
     {"day":2,"name":"经验抗感染","action":"指南推荐经验性抗菌治疗，48-72h复评"},
     {"day":4,"name":"疗效评估","action":"病原学回报后目标治疗，降阶梯"},
     {"day":6,"name":"康复","action":"体温正常、影像学吸收评估"},
     {"day":7,"name":"出院","action":"口服序贯疗程，呼吸科门诊随访"}]'::jsonb,
   '[{"name":"床位费","amountCny":840},{"name":"检查费","amountCny":1600},
     {"name":"药品费(抗菌)","amountCny":2600},{"name":"护理费","amountCny":900},
     {"name":"耗材费","amountCny":560}]'::jsonb,
   6500, 'guideline_2016'),
  ('PNEUM-HAP', 'pneumonia', 'hap',
   '医院获得性肺炎（HAP/VAP）临床路径', 'J95.8', 10,
   '[{"day":1,"name":"院内评估","action":"痰培养/血培养/胸部影像，MRSA/铜绿风险分层"},
     {"day":2,"name":"经验治疗","action":"抗MRSA/抗铜绿经验治疗，集束化护理"},
     {"day":5,"name":"病原复评","action":"培养结果回报后降阶梯，呼吸机相关肺炎Bundle"},
     {"day":8,"name":"撤机评估","action":"脱机条件评估，口腔护理与抬高床头"},
     {"day":10,"name":"出院/转归","action":"疗程总结，感染科随访"}]'::jsonb,
   '[{"name":"床位费","amountCny":1400},{"name":"检查费","amountCny":2600},
     {"name":"药品费(广谱抗菌)","amountCny":5200},{"name":"护理费","amountCny":1800},
     {"name":"耗材费","amountCny":1000}]'::jsonb,
   12000, 'guideline_2018'),
  ('DM-T2', 'diabetes_mellitus', 'type2',
   '2型糖尿病血糖调控临床路径', 'E11.9', 8,
   '[{"day":1,"name":"入院评估","action":"HbA1c/C肽/并发症筛查，低血糖风险评估"},
     {"day":2,"name":"方案制定","action":"个体化降糖方案（口服/胰岛素），医学营养治疗"},
     {"day":4,"name":"血糖监测","action":"七段血糖谱调药，低血糖宣教"},
     {"day":7,"name":"并发症管理","action":"眼底/尿微量白蛋白/足部筛查"},
     {"day":8,"name":"出院","action":"自我血糖监测教育，内分泌门诊随访"}]'::jsonb,
   '[{"name":"床位费","amountCny":960},{"name":"检查费","amountCny":2200},
     {"name":"药品费","amountCny":2400},{"name":"护理费","amountCny":1000},
     {"name":"耗材费(血糖试条)","amountCny":640}]'::jsonb,
   7200, 'guideline_2020'),
  ('DM-GDM', 'diabetes_mellitus', 'gestational',
   '妊娠糖尿病（GDM）临床路径', 'O24.4', 5,
   '[{"day":1,"name":"妊娠评估","action":"OGTT复核、胎儿超声、产科+内分泌共管"},
     {"day":2,"name":"医学营养治疗","action":"营养师制定食谱，血糖自我监测"},
     {"day":3,"name":"药物治疗","action":"血糖不达标起始胰岛素（妊娠期安全）"},
     {"day":4,"name":"胎儿监护","action":"胎心监护，评估分娩时机"},
     {"day":5,"name":"出院","action":"产后6-12周复查OGTT，母婴随访"}]'::jsonb,
   '[{"name":"床位费","amountCny":700},{"name":"检查费","amountCny":1800},
     {"name":"药品费(胰岛素)","amountCny":1500},{"name":"护理费","amountCny":1200},
     {"name":"耗材费","amountCny":600}]'::jsonb,
   5800, 'guideline_2022'),
  ('CHOLE-LAP', 'cholecystectomy', 'laparoscopic',
   '腹腔镜胆囊切除术临床路径', 'K80.2', 4,
   '[{"day":1,"name":"术前评估","action":"腹部超声/肝功能/凝血，术前谈话"},
     {"day":2,"name":"手术","action":"腹腔镜胆囊切除术（LC），术中胆道造影按需"},
     {"day":3,"name":"术后观察","action":"排气恢复、切口护理、早期下床"},
     {"day":4,"name":"出院","action":"低脂饮食指导，普外科门诊随访"}]'::jsonb,
   '[{"name":"床位费","amountCny":480},{"name":"检查费","amountCny":1200},
     {"name":"麻醉手术费","amountCny":5600},{"name":"药品费","amountCny":1500},
     {"name":"耗材费","amountCny":1800},{"name":"护理费","amountCny":420}]'::jsonb,
   11000, 'guideline_2021')
ON CONFLICT (pathway_code) DO UPDATE
  SET pathway_name      = EXCLUDED.pathway_name,
      icd_code          = EXCLUDED.icd_code,
      standard_los_days = EXCLUDED.standard_los_days,
      steps             = EXCLUDED.steps,
      cost_breakdown    = EXCLUDED.cost_breakdown,
      estimated_cost_cny= EXCLUDED.estimated_cost_cny,
      evidence_level    = EXCLUDED.evidence_level,
      updated_at        = now();
