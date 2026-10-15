-- ============================================================================
-- 健澜科技 jlmedaios · M131-D 医学知识图谱（AI 能力深化）
-- 258-medical-graph.sql
--
-- 业务定位：
--   面向临床辅助决策（CDS）的医学知识图谱落库层。把「疾病—症状—药物—
--   检查—手术」之间的权威医学关系结构化为二部图，支撑：
--     1. 疾病一键展开：该疾病有哪些典型症状 / 推荐用药 / 必做检查 / 可选手术；
--     2. 症状反查：由主诉症状反推可能疾病，辅助分诊与诊断建议；
--     3. 用药安全：药物—药物相互作用（DDI）边，处方前置审核告警；
--     4. 路径推理：从「症状」出发沿边搜索到「推荐检查 / 治疗药物」的最短路径。
--
-- 【AI 能力深化】
--   本表为 BFF 纯函数聚合器（medicalGraphAggregator）的持久化底座：
--   内存种子图用于单测与 DEMO_MODE，生产环境可由 ETL 从本院 HIS/LIS/PACS
--   脱敏数据 + 权威指南摘要批量灌入，聚合器按同构类型读取，无需改动前端。
--
-- 节点类型（node_type）：
--   disease  疾病   （高血压 / 2型糖尿病 / 冠心病 …，对齐 ICD-10 编码）
--   symptom  症状   （头晕 / 胸痛 / 发热 …，对齐 SNOMED-CT 症状组）
--   drug     药物   （氨氯地平 / 二甲双胍 …，对齐药品通用名）
--   exam     检查   （空腹血糖 / 冠脉造影 / 胃镜 …）
--   surgery  手术   （PCI 支架植入 / 内镜下止血 …）
--
-- 边类型（relation_type）：
--   disease_has_symptom        疾病 → 症状        （疾病典型表现）
--   disease_treated_by_drug    疾病 → 药物        （指南推荐治疗用药）
--   symptom_suggests_disease   症状 → 疾病        （症状提示的可能诊断）
--   drug_interacts_with_drug   药物 → 药物        （药物相互作用 / DDI）
--   disease_needs_exam         疾病 → 检查        （诊断所需检查）
--   disease_has_surgery        疾病 → 手术        （可选/必需手术方式）
--
-- 安全红线：
--   - 仅存储医学本体知识（脱敏），不含任何患者个人标识符（PII）；
--   - 知识来源固定标注 sources（指南 / 教材名称 + 年份），全程可溯源；
--   - 药物相互作用边 weight 越高风险越大，处方审核侧据此分级告警；
--   - 边为有向边；反向语义（症状→疾病）由显式边表达，不做隐式反向遍历。
--
-- 兼容：CREATE TABLE IF NOT EXISTS，可重复执行（幂等迁移）。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 节点表：医学概念实体
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.medical_graph_node (
  id            bigserial PRIMARY KEY,
  node_code     text        NOT NULL UNIQUE,          -- 稳定编码（ICD-10 / SNOMED / 药品通用名拼音首字母，如 I10 / SYM-DIZZINESS / DRG-AMLODIPINE）
  name          text        NOT NULL,                 -- 中文标准名（如「高血压」「头晕」）
  node_type     text        NOT NULL
                CHECK (node_type IN ('disease', 'symptom', 'drug', 'exam', 'surgery')),
  description   text        NOT NULL DEFAULT '',      -- 概念简述（定义 / 临床意义）
  sources       jsonb       NOT NULL DEFAULT '[]'::jsonb,  -- 来源：[{ name, year }] 指南 / 教材
  evidence_level numeric    NOT NULL DEFAULT 0.5       -- 证据强度 0~1（0.9=指南强推荐）
                CHECK (evidence_level BETWEEN 0 AND 1),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  clinical.medical_graph_node IS 'M131-D 医学知识图谱节点：疾病/症状/药物/检查/手术';
COMMENT ON COLUMN clinical.medical_graph_node.node_type IS 'disease 疾病 / symptom 症状 / drug 药物 / exam 检查 / surgery 手术';
COMMENT ON COLUMN clinical.medical_graph_node.evidence_level IS '证据强度 0~1，源自指南推荐等级折算';

-- 名称模糊检索（医生输入「高血压」前缀匹配）
CREATE INDEX IF NOT EXISTS idx_medical_graph_node_name
  ON clinical.medical_graph_node (name);

-- 按类型拉取某一类全部节点（前端图例筛选）
CREATE INDEX IF NOT EXISTS idx_medical_graph_node_type
  ON clinical.medical_graph_node (node_type);

-- ----------------------------------------------------------------------------
-- 边表：医学概念之间的有向关系
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.medical_graph_edge (
  id            bigserial PRIMARY KEY,
  source_node_id bigserial NOT NULL REFERENCES clinical.medical_graph_node(id) ON DELETE CASCADE,
  target_node_id bigserial NOT NULL REFERENCES clinical.medical_graph_node(id) ON DELETE CASCADE,
  relation_type text       NOT NULL
                CHECK (relation_type IN (
                  'disease_has_symptom',        -- 疾病 → 症状
                  'disease_treated_by_drug',    -- 疾病 → 药物
                  'symptom_suggests_disease',   -- 症状 → 疾病
                  'drug_interacts_with_drug',   -- 药物 → 药物（DDI）
                  'disease_needs_exam',         -- 疾病 → 检查
                  'disease_has_surgery'         -- 疾病 → 手术
                )),
  weight        numeric     NOT NULL DEFAULT 0.5     -- 关系强度 0~1（DDI 边表示风险等级）
                CHECK (weight BETWEEN 0 AND 1),
  label         text        NOT NULL DEFAULT '',     -- 边的中文短标注（如「典型表现」「一线用药」）
  sources       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- 同一对节点之间同类型关系唯一，避免重复灌入
  UNIQUE (source_node_id, target_node_id, relation_type)
);

COMMENT ON TABLE  clinical.medical_graph_edge IS 'M131-D 医学知识图谱边：疾病/症状/药物/检查/手术之间的有向医学关系';
COMMENT ON COLUMN clinical.medical_graph_edge.relation_type IS '六种有向医学关系，见文件头枚举';
COMMENT ON COLUMN clinical.medical_graph_edge.weight IS '关系强度；drug_interacts_with_drug 边表示相互作用风险等级（越高越需告警）';

-- 从某节点出发按关系类型遍历（ego 图展开主查询）
CREATE INDEX IF NOT EXISTS idx_medical_graph_edge_source_rel
  ON clinical.medical_graph_edge (source_node_id, relation_type);

-- 反向索引：症状反查疾病、药物 DDI 双侧查询
CREATE INDEX IF NOT EXISTS idx_medical_graph_edge_target
  ON clinical.medical_graph_edge (target_node_id);

-- 关系类型全图统计（知识覆盖度看板）
CREATE INDEX IF NOT EXISTS idx_medical_graph_edge_type
  ON clinical.medical_graph_edge (relation_type);
