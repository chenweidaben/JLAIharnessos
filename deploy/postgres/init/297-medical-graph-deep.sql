-- ============================================================================
-- 健澜科技 jlmedaios · M147-A 医学知识图谱深化（知识图谱与患者教育）
-- 297-medical-graph-deep.sql
--
-- 业务定位：
--   在 M131-D（258-medical-graph.sql）「疾病—症状—药物—检查—手术」二部图
--   基础上做深化，面向「临床辅助决策 + 患者教育」双场景：
--     1. 新增「科室」节点：疾病 → 首诊科室 / 转诊科室，支撑智能导诊与分诊；
--     2. 边增加结构化 qualifier 字段，把 M131-D 里写死在 label 里的
--        「常见/鉴别、一线/二线、必做/选做、首诊/转诊」升级为可查询列；
--     3. 种子数据全部标注指南出处（sources jsonb），每条关系可溯源；
--     4. 为 BFF 纯函数 queryDiseaseGraph / findDifferentialDiagnosis 提供
--        持久化底座（内存种子图与本表同构，生产环境 ETL 批量灌入）。
--
-- 节点类型扩展（node_type）：
--   disease  疾病 / symptom 症状 / drug 药物 / exam 检查 / surgery 手术
--   department 科室（M147-A 新增：心内科 / 内分泌科 / 呼吸内科 …）
--
-- 边类型扩展（relation_type）：
--   + disease_visit_department  疾病 → 科室（首诊 / 转诊，由 qualifier 区分）
--   既有六类关系不变；qualifier 取值：
--     disease_has_symptom     → 常见 / 鉴别
--     disease_treated_by_drug → 一线 / 二线
--     disease_needs_exam       → 必做 / 选做
--     disease_visit_department → 首诊 / 转诊
--
-- 医疗安全红线：
--   - 仅存储医学本体知识（脱敏），不含任何患者个人标识符（PII）；
--   - 知识来源固定标注 sources（指南 / 教材名称 + 年份），全程可溯源；
--   - 鉴别诊断边（qualifier='鉴别'）权重低于常见症状，避免过度提示；
--   - 本脚本幂等：CREATE/ALTER IF NOT EXISTS + DO 块兜底，可重复执行。
--
-- 兼容：依赖 258-medical-graph.sql 已建表（IF NOT EXISTS 不重建）。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 节点表：放开 node_type CHECK，允许 department（科室）
-- ----------------------------------------------------------------------------
-- 258 中建表时 CHECK 为内联约束，PostgreSQL 自动命名为
-- medical_graph_node_node_type_check；这里用 DO 块兜底删除旧约束再建新约束。
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'clinical'
      AND t.relname = 'medical_graph_node'
      AND c.conname = 'medical_graph_node_node_type_check'
  ) THEN
    ALTER TABLE clinical.medical_graph_node
      DROP CONSTRAINT clinical.medical_graph_node_node_type_check;
  END IF;
END $$;

ALTER TABLE clinical.medical_graph_node
  ADD CONSTRAINT clinical.medical_graph_node_node_type_check
  CHECK (node_type IN ('disease', 'symptom', 'drug', 'exam', 'surgery', 'department'));

COMMENT ON COLUMN clinical.medical_graph_node.node_type IS
  'disease 疾病 / symptom 症状 / drug 药物 / exam 检查 / surgery 手术 / department 科室（M147-A 新增）';

-- ----------------------------------------------------------------------------
-- 2. 边表：放开 relation_type CHECK，允许 disease_visit_department（疾病→科室）
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
    'symptom_suggests_disease',   -- 症状 → 疾病
    'drug_interacts_with_drug',   -- 药物 → 药物（DDI）
    'disease_needs_exam',         -- 疾病 → 检查
    'disease_has_surgery',        -- 疾病 → 手术
    'disease_visit_department'    -- 疾病 → 科室（M147-A 新增）
  ));

-- ----------------------------------------------------------------------------
-- 3. 边表：新增结构化 qualifier 列（常见/鉴别、一线/二线、必做/选做、首诊/转诊）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.medical_graph_edge
  ADD COLUMN IF NOT EXISTS qualifier text NOT NULL DEFAULT '';

COMMENT ON COLUMN clinical.medical_graph_edge.qualifier IS
  '关系细分：disease_has_symptom→常见/鉴别；disease_treated_by_drug→一线/二线；'
  || 'disease_needs_exam→必做/选做；disease_visit_department→首诊/转诊；其余关系留空';

-- 按关系类型 + qualifier 联合检索（BFF 按「一线用药」「首诊科室」过滤）
CREATE INDEX IF NOT EXISTS idx_medical_graph_edge_rel_qual
  ON clinical.medical_graph_edge (relation_type, qualifier);

-- ----------------------------------------------------------------------------
-- 4. 种子数据：科室节点（基于医院科室设置与指南首诊路径）
--    node_code 对齐 DPT-<科室拼音首字母>，sources 标注来源。
-- ----------------------------------------------------------------------------
INSERT INTO clinical.medical_graph_node (node_code, name, node_type, description, sources, evidence_level)
VALUES
  ('DPT-XGNK', '心血管内科', 'department', '高血压、冠心病等心血管疾病首诊与随访科室。',
    '[{"name":"中国高血压防治指南","year":"2024"},{"name":"国家卫健委科室设置规范","year":"2021"}]'::jsonb, 0.9),
  ('DPT-NFMK', '内分泌科', 'department', '糖尿病、甲状腺等代谢性疾病首诊与血糖管理科室。',
    '[{"name":"中国2型糖尿病防治指南","year":"2020"}]'::jsonb, 0.9),
  ('DPT-HXXNK', '呼吸与危重症医学科', 'department', '社区获得性肺炎、慢性气道疾病首诊科室。',
    '[{"name":"社区获得性肺炎诊断和治疗指南","year":"2016"}]'::jsonb, 0.85),
  ('DPT-XHNK', '消化内科', 'department', '消化性溃疡、上消化道出血等胃肠疾病首诊科室。',
    '[{"name":"消化性溃疡诊断与治疗规范","year":"2022"}]'::jsonb, 0.9),
  ('DPT-SJNK', '神经内科', 'department', '脑梗死、短暂性脑缺血发作等脑血管疾病首诊/溶栓科室。',
    '[{"name":"中国急性缺血性脑卒中诊治指南","year":"2023"}]'::jsonb, 0.9),
  ('DPT-JCYY', '全科医学科', 'department', '慢病初筛、未分化症状首诊与双向转诊入口科室。',
    '[{"name":"国家基层高血压防治管理指南","year":"2023"}]'::jsonb, 0.8)
ON CONFLICT (node_code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. 种子边：疾病 → 科室（首诊 / 转诊）
--    通过 node_code 关联既有疾病节点（258 种子：I10=高血压/E11=DM2/…）。
--    此处用 node_code 子查询定位 source/target，避免硬编码 bigserial id。
-- ----------------------------------------------------------------------------
INSERT INTO clinical.medical_graph_edge (source_node_id, target_node_id, relation_type, weight, label, qualifier, sources)
SELECT s.id, t.id, 'disease_visit_department',
       v.weight, v.label, v.qualifier,
       ('[{"name":"' || v.source_name || '","year":"' || v.source_year || '"}]')::jsonb
FROM (VALUES
  -- (疾病 node_code, 科室 node_code, weight, label, qualifier, 指南名, 年份)
  ('I10',        'DPT-XGNK',  0.9,  '首诊科室', '首诊', '中国高血压防治指南', '2024'),
  ('I10',        'DPT-JCYY',  0.6,  '基层管理转诊', '转诊', '国家基层高血压防治管理指南', '2023'),
  ('E11',        'DPT-NFMK', 0.9,  '首诊科室', '首诊', '中国2型糖尿病防治指南', '2020'),
  ('E11',        'DPT-JCYY',  0.55, '基层随访转诊', '转诊', '国家基层糖尿病防治管理指南', '2022'),
  ('I25.1',      'DPT-XGNK',  0.9,  '首诊科室', '首诊', '稳定性冠心病诊断与治疗指南', '2018'),
  ('J15.9',      'DPT-HXXNK', 0.85, '首诊科室', '首诊', '社区获得性肺炎诊断和治疗指南', '2016'),
  ('K25.9',      'DPT-XHNK',  0.9,  '首诊科室', '首诊', '消化性溃疡诊断与治疗规范', '2022'),
  ('I63.9',      'DPT-SJNK',  0.9,  '卒中中心首诊', '首诊', '中国急性缺血性脑卒中诊治指南', '2023')
) AS v(src_code, tgt_code, weight, label, qualifier, source_name, source_year)
JOIN clinical.medical_graph_node s ON s.node_code = v.src_code
JOIN clinical.medical_graph_node t ON t.node_code = v.tgt_code
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. 回填既有边的 qualifier（M131-D label 里已含分层信息，结构化到列）
--    仅对 M131-D 种子边做幂等回填，不影响生产 ETL 写入。
-- ----------------------------------------------------------------------------
UPDATE clinical.medical_graph_edge e
SET qualifier = v.qualifier
FROM (VALUES
  -- (source_code, target_code, relation_type, qualifier)
  ('I10',   'SYM-DIZZINESS', 'disease_has_symptom', '常见'),
  ('I10',   'SYM-HEADACHE', 'disease_has_symptom', '常见'),
  ('I10',   'DRG-AMLODIPINE','disease_treated_by_drug','一线'),
  ('I10',   'DRG-VALSARTAN', 'disease_treated_by_drug','一线'),
  ('I10',   'EXAM-BP',       'disease_needs_exam',     '必做')
) AS v(src_code, tgt_code, rel, qualifier)
JOIN clinical.medical_graph_node s ON s.node_code = v.src_code
JOIN clinical.medical_graph_node t ON t.node_code = v.tgt_code
WHERE e.source_node_id = s.id
  AND e.target_node_id = t.id
  AND e.relation_type = v.rel
  AND e.qualifier = '';

-- ----------------------------------------------------------------------------
-- 7. 覆盖度自检视图：按 node_type / relation_type+qualifier 统计知识条数
--    （知识资产看板直接 select，无需额外 JOIN）
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW clinical.medical_graph_deep_coverage AS
SELECT n.node_type, COUNT(*) AS node_count
FROM clinical.medical_graph_node n
GROUP BY n.node_type
UNION ALL
SELECT e.relation_type || COALESCE('|' || NULLIF(e.qualifier,''), '') AS node_type,
       COUNT(*) AS edge_count
FROM clinical.medical_graph_edge e
GROUP BY e.relation_type, e.qualifier;

COMMENT ON VIEW clinical.medical_graph_deep_coverage IS
  'M147-A 知识图谱深化覆盖度：节点按类型、边按关系+qualifier 统计';
