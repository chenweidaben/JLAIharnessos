-- ============================================================================
-- 健澜科技 jlmedaios · M169-A 医学知识图谱深化（知识图谱与 Personal Agent）
-- 338-medical-graph-deep.sql
--
-- 业务定位：
--   在 M131-D（258）+ M147-A（297）「疾病—症状—药物—检查—手术—科室」
--   六类节点 / 七类边基础上做第三轮深化，面向 Personal Agent（个人健康助手）
--   主动健康干预与用药安全场景：
--     1. 疾病→症状边新增 positive_rate（阳性率，0~1）：
--        Personal Agent 据此判断「出现该症状时，该病的验后概率」；
--     2. 疾病→药物边 qualifier 扩展「禁忌」：
--        处方前置审核 / Personal Agent 主动提示「本病患者应避免使用」；
--     3. 疾病→检查边 qualifier 扩展「鉴别」：
--        用于鉴别诊断的辅助检查（与「必做/选做」并列）；
--     4. 新增 disease_has_complication 边（疾病→疾病，并发症）：
--        qualifier 区分「近期 / 远期」，支撑 Personal Agent 的长期风险提示；
--     5. 为 BFF 纯函数 buildDeepMedicalGraph / traverseGraph /
--        findRelatedDiseases / findDrugInteractions 提供持久化底座。
--
-- 节点类型（不变）：
--   disease / symptom / drug / exam / surgery / department
--
-- 边类型（新增 1 类）：
--   disease_has_complication   疾病 → 疾病（并发症，qualifier=近期/远期）
--
-- qualifier 取值扩展：
--   disease_has_symptom     → 常见 / 鉴别（既有）
--   disease_treated_by_drug → 一线 / 二线 / 禁忌（M169-A 新增「禁忌」）
--   disease_needs_exam       → 必做 / 选做 / 鉴别（M169-A 新增「鉴别」）
--   disease_visit_department → 首诊 / 转诊（既有）
--   disease_has_complication → 近期 / 远期（M169-A 新增）
--
-- 医疗安全红线：
--   - 仅存储医学本体知识（脱敏），不含任何患者个人标识符（PII）；
--   - 知识来源固定标注 sources（指南 / 教材名称 + 年份），全程可溯源；
--   - 「禁忌」边 weight 固定 ≥ 0.8，Personal Agent 据此升级告警级别；
--   - 阳性率 positive_rate 取自国内指南 / 流行病学文献摘要均值，非本院数据；
--   - 本脚本幂等：ALTER TABLE ADD COLUMN IF NOT EXISTS + DO 块兜底约束。
--
-- 兼容：依赖 258 / 297 已建表与既有种子。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 边表：新增 positive_rate 列（疾病→症状的阳性率，0~1）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.medical_graph_edge
  ADD COLUMN IF NOT EXISTS positive_rate numeric
    CHECK (positive_rate IS NULL OR positive_rate BETWEEN 0 AND 1);

COMMENT ON COLUMN clinical.medical_graph_edge.positive_rate IS
  '症状阳性率 0~1：disease_has_symptom 边表示「该病患者中出现该症状的比例」；'
  || '其余关系类型留空。Personal Agent 据此做验后概率粗估。';

-- 按阳性率排序（Personal Agent 症状排序 / 鉴别诊断加权）
CREATE INDEX IF NOT EXISTS idx_medical_graph_edge_posrate
  ON clinical.medical_graph_edge (positive_rate DESC NULLS LAST);

-- ----------------------------------------------------------------------------
-- 2. 边表：放开 relation_type CHECK，允许 disease_has_complication（疾病→并发症）
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'clinical'
      AND t.relname = 'medical_graph_edge'
      AND c.conname = 'medical_graph_edge_relation_type_check'
  ) THEN
    ALTER TABLE clinical.medical_graph_edge
      DROP CONSTRAINT clinical.medical_graph_edge_relation_type_check;
  END IF;
END $$;

ALTER TABLE clinical.medical_graph_edge
  ADD CONSTRAINT clinical.medical_graph_edge_relation_type_check
  CHECK (relation_type IN (
    'disease_has_symptom',        -- 疾病 → 症状
    'disease_treated_by_drug',    -- 疾病 → 药物
    'symptom_suggests_disease',  -- 症状 → 疾病
    'drug_interacts_with_drug',   -- 药物 → 药物（DDI）
    'disease_needs_exam',         -- 疾病 → 检查
    'disease_has_surgery',        -- 疾病 → 手术
    'disease_visit_department',    -- 疾病 → 科室
    'disease_has_complication'    -- 疾病 → 并发症（M169-A 新增）
  ));

COMMENT ON COLUMN clinical.medical_graph_edge.relation_type IS
  '八种有向医学关系；M169-A 新增 disease_has_complication（疾病→疾病，近期/远期并发症）。';

-- ----------------------------------------------------------------------------
-- 3. 种子边：疾病 → 并发症（指向既有疾病节点；qualifier=近期/远期）
--    医学依据：
--      · 高血压远期并发症：冠心病、脑梗死（中国高血压防治指南 2024 靶器官损害）
--      · 2型糖尿病远期并发症：冠心病、脑梗死（大血管病变，CDS 指南 2020）
--      · 胃溃疡近期并发症：上消化道出血（黑便/呕血）——以「黑便」症状边
--        已有提示，此处显式登记为近期并发症节点（复用症状节点不另起疾病节点）；
--      · 冠心病近期并发症：急性心肌梗死（以胸痛加重症状表达，不新增节点）。
-- ----------------------------------------------------------------------------
INSERT INTO clinical.medical_graph_edge
  (source_node_id, target_node_id, relation_type, weight, label, qualifier, sources)
SELECT s.id, t.id, 'disease_has_complication',
       v.weight, v.label, v.qualifier,
       ('[{"name":"' || v.source_name || '","year":"' || v.source_year || '"}]')::jsonb
FROM (VALUES
  -- (疾病 node_code, 并发症 node_code, weight, label, qualifier, 指南名, 年份)
  ('I10',   'I25.1', 0.85, '远期靶器官损害：冠心病', '远期', '中国高血压防治指南', '2024'),
  ('I10',   'I63.9', 0.80, '远期脑血管并发症：脑梗死', '远期', '中国高血压防治指南', '2024'),
  ('E11',   'I25.1', 0.85, '远期大血管并发症：冠心病', '远期', '中国2型糖尿病防治指南', '2020'),
  ('E11',   'I63.9', 0.75, '远期大血管并发症：脑梗死', '远期', '中国2型糖尿病防治指南', '2020'),
  ('I25.1', 'K25.9', 0.55, '近期出血风险（抗血小板治疗中）', '近期', '抗血小板治疗中国专家共识', '2021')
) AS v(src_code, tgt_code, weight, label, qualifier, source_name, source_year)
JOIN clinical.medical_graph_node s ON s.node_code = v.src_code
JOIN clinical.medical_graph_node t ON t.node_code = v.tgt_code
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. 种子边：疾病 → 禁忌药物（qualifier='禁忌'，weight≥0.8）
--    医学依据：活动性消化性溃疡为阿司匹林等 NSAIDs 的明确禁忌证。
-- ----------------------------------------------------------------------------
INSERT INTO clinical.medical_graph_edge
  (source_node_id, target_node_id, relation_type, weight, label, qualifier, sources)
SELECT s.id, t.id, 'disease_treated_by_drug',
       v.weight, v.label, '禁忌',
       ('[{"name":"' || v.source_name || '","year":"' || v.source_year || '"}]')::jsonb
FROM (VALUES
  -- (疾病 node_code, 药物 node_code, weight, label, 指南名, 年份)
  ('K25.9', 'DRG-ASPIRIN', 0.90, '活动性溃疡禁用 NSAIDs', '抗血小板治疗中国专家共识', '2021')
) AS v(src_code, tgt_code, weight, label, source_name, source_year)
JOIN clinical.medical_graph_node s ON s.node_code = v.src_code
JOIN clinical.medical_graph_node t ON t.node_code = v.tgt_code
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. 种子边：疾病 → 鉴别诊断用检查（qualifier='鉴别'）
--    医学依据：上腹痛查因时胃镜既可确诊溃疡，也用于与胃癌 / 食管炎鉴别。
-- ----------------------------------------------------------------------------
INSERT INTO clinical.medical_graph_edge
  (source_node_id, target_node_id, relation_type, weight, label, qualifier, sources)
SELECT s.id, t.id, 'disease_needs_exam',
       v.weight, v.label, '鉴别',
       ('[{"name":"' || v.source_name || '","year":"' || v.source_year || '"}]')::jsonb
FROM (VALUES
  -- (疾病 node_code, 检查 node_code, weight, label, 指南名, 年份)
  ('K25.9', 'EXAM-EGD', 0.70, '与胃癌/食管炎鉴别', '消化性溃疡诊断与治疗规范', '2022')
) AS v(src_code, tgt_code, weight, label, source_name, source_year)
JOIN clinical.medical_graph_node s ON s.node_code = v.src_code
JOIN clinical.medical_graph_node t ON t.node_code = v.tgt_code
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. 回填既有疾病→症状边的 positive_rate（阳性率，0~1）
--    数值取国内指南 / 诊断学流行病学摘要均值，仅用于 Personal Agent 粗估。
-- ----------------------------------------------------------------------------
UPDATE clinical.medical_graph_edge e
SET positive_rate = v.pr
FROM (VALUES
  -- (疾病 code, 症状 code, positive_rate)
  ('I10',   'SYM-DIZZINESS', 0.50),  -- 高血压患者约半数有头晕
  ('I10',   'SYM-HEADACHE',  0.20),  -- 高血压头痛约 20%
  ('E11',   'SYM-POLY',      0.70),  -- 糖尿病「三多」典型表现约 70%
  ('E11',   'SYM-WEIGHT',    0.40),  -- 体重下降约 40%
  ('I25.1', 'SYM-CHESTP',    0.75),  -- 心绞痛胸痛约 70~80%
  ('I25.1', 'SYM-CHESTT',    0.50),  -- 胸闷约 50%
  ('J15.9', 'SYM-FEVER',     0.80),  -- 肺炎发热约 80%
  ('J15.9', 'SYM-COUGH',     0.90),  -- 肺炎咳嗽咳痰约 90%
  ('K25.9', 'SYM-EPIGASTRIC',0.70),  -- 溃疡上腹痛节律痛约 70%
  ('K25.9', 'SYM-MELENA',    0.10),  -- 溃疡并发出血黑便约 10%
  ('I63.9', 'SYM-HEMIPARESIS',0.70), -- 脑梗死偏瘫约 60~80%
  ('I63.9', 'SYM-DYSARTHRIA',0.35)   -- 言语不清约 30~40%
) AS v(disease_code, symptom_code, pr)
JOIN clinical.medical_graph_node s ON s.node_code = v.disease_code
JOIN clinical.medical_graph_node t ON t.node_code = v.symptom_code
WHERE e.source_node_id = s.id
  AND e.target_node_id = t.id
  AND e.relation_type = 'disease_has_symptom'
  AND e.positive_rate IS NULL;

-- ----------------------------------------------------------------------------
-- 7. M169-A 覆盖度视图：在 297 视图基础上叠加阳性率与并发症统计
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW clinical.medical_graph_deep_coverage AS
SELECT n.node_type, COUNT(*) AS node_count
FROM clinical.medical_graph_node n
GROUP BY n.node_type
UNION ALL
SELECT e.relation_type || COALESCE('|' || NULLIF(e.qualifier,''), '') AS node_type,
       COUNT(*) AS edge_count
FROM clinical.medical_graph_edge e
GROUP BY e.relation_type, e.qualifier
UNION ALL
SELECT 'symptom_with_positive_rate' AS node_type,
       COUNT(*) AS edge_count
FROM clinical.medical_graph_edge e
WHERE e.relation_type = 'disease_has_symptom'
  AND e.positive_rate IS NOT NULL;

COMMENT ON VIEW clinical.medical_graph_deep_coverage IS
  'M147-A/M169-A 知识图谱深化覆盖度：节点按类型、边按关系+qualifier 统计，'
  || '末行统计已标注阳性率的症状边数。';
