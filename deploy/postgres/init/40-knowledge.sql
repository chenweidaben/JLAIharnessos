-- ============================================================================
-- 健澜科技杠OS - 医疗知识中台表
-- 40-knowledge.sql
--
-- 表结构与 scripts/knowledge/seed-data/*.ts 种子字段一一对齐，
-- 由 scripts/db/import-seed.ts 导入权威开放知识库。
--
-- 向量列：默认使用 jsonb 存 embedding（应用层余弦检索，零扩展依赖）；
-- 生产环境安装 pgvector 后，见 90-pgvector-optional.sql 切换为 vector 列 + ivfflat。
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

-- 知识库（临床指南/药品说明/检验参考/ICD/随访方案/科室映射…）
CREATE TABLE knowledge.knowledge_bases (
  id            text PRIMARY KEY,               -- 逻辑名，如 clinical-guidelines
  name          text NOT NULL,
  description   text,
  authority_level text NOT NULL DEFAULT 'general' CHECK (authority_level IN ('guideline','drug','standard','textbook','general')),
  source        text,
  license       text,
  version       text,
  enabled       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_kb_updated BEFORE UPDATE ON knowledge.knowledge_bases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 知识文档
CREATE TABLE knowledge.documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id         text NOT NULL REFERENCES knowledge.knowledge_bases(id),
  source_id     text,                            -- 外部来源标识
  title         text NOT NULL,
  author        text,
  publisher     text,
  publish_date  date,
  version       text,
  doc_type      text,
  authority_level text,
  source_url    text,
  license       text,
  metadata      jsonb NOT NULL DEFAULT '{}',
  content       text,
  status        text NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_kb ON knowledge.documents(kb_id);
CREATE INDEX idx_documents_title_trgm ON knowledge.documents USING gin (title gin_trgm_ops);
CREATE INDEX idx_documents_meta ON knowledge.documents USING gin (metadata jsonb_path_ops);
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON knowledge.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 知识分块（检索最小单元）
CREATE TABLE knowledge.chunks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid NOT NULL REFERENCES knowledge.documents(id) ON DELETE CASCADE,
  kb_id         text NOT NULL REFERENCES knowledge.knowledge_bases(id),
  chunk_index   integer NOT NULL,
  section_path  text,
  content       text NOT NULL,
  token_count   integer,
  embedding     jsonb,                           -- 降级：向量以数组存 jsonb；pgvector 见可选迁移
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);
CREATE INDEX idx_chunks_doc ON knowledge.chunks(document_id);
CREATE INDEX idx_chunks_kb ON knowledge.chunks(kb_id);
CREATE INDEX idx_chunks_ft ON knowledge.chunks USING gin (to_tsvector('simple', content));

-- 药品（对齐 DrugSeed：n 通用名 / c 药理分类 / f 剂型 / caution 警示 / rx 处方药）
CREATE TABLE knowledge.drugs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generic_name  text NOT NULL,                   -- n
  drug_class    text NOT NULL,                   -- c 药理分类键
  dosage_forms  jsonb NOT NULL DEFAULT '[]',     -- f 剂型数组
  caution       text,                            -- 专属警示/黑框
  is_rx         boolean NOT NULL DEFAULT true,   -- rx 是否处方药
  atc_code      text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_drugs_name ON knowledge.drugs(generic_name);
CREATE INDEX idx_drugs_class ON knowledge.drugs(drug_class);

-- ICD-10 精选编码（对齐 ICD10_CURATED：code|name）
CREATE TABLE knowledge.icd10 (
  code          text PRIMARY KEY,
  name          text NOT NULL,
  block_start   text,
  is_curated    boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_icd10_name_trgm ON knowledge.icd10 USING gin (name gin_trgm_ops);

-- ICD-10 类目块（对齐 ICD10_BLOCKS：start,end,name）
CREATE TABLE knowledge.icd_blocks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  range_start   text NOT NULL,
  range_end     text NOT NULL,
  name          text NOT NULL
);

-- 检验项目（对齐 LabTuple：名称,缩写,LOINC,标本,单位,下限,上限,危急低,危急高,备注）
CREATE TABLE knowledge.labs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name     text NOT NULL,
  abbreviation  text,
  loinc_code    text,
  specimen      text,
  unit          text,
  ref_low       numeric(14,4),
  ref_high      numeric(14,4),
  critical_low  numeric(14,4),
  critical_high numeric(14,4),
  remark        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_labs_loinc ON knowledge.labs(loinc_code);
CREATE INDEX idx_labs_name_trgm ON knowledge.labs USING gin (item_name gin_trgm_ops);

-- 检查项目（对齐 ExamTuple：名称,分类,缩写,适应症,预约/准备）
CREATE TABLE knowledge.exams (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_name     text NOT NULL,
  category      text NOT NULL,
  abbreviation  text,
  indications   text,
  preparation   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_exams_name_trgm ON knowledge.exams USING gin (exam_name gin_trgm_ops);
CREATE INDEX idx_exams_category ON knowledge.exams(category);

-- 临床路径（对齐 PathwayTuple：病种,ICD,标准住院日,治疗要点,阶段,出院标准,变异来源）
CREATE TABLE knowledge.clinical_pathways (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease         text NOT NULL,
  icd_code        text,
  standard_los    integer,                       -- 标准住院日
  treatment       text,
  stages          text,
  discharge_criteria text,
  variation_sources text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pathways_disease_trgm ON knowledge.clinical_pathways USING gin (disease gin_trgm_ops);
CREATE INDEX idx_pathways_icd ON knowledge.clinical_pathways(icd_code);

-- 临床指南（对齐 GuidelineTuple：名称,机构,要点,证据/说明,关联病种）
CREATE TABLE knowledge.guidelines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  publisher     text,
  key_points    text,
  evidence      text,
  related_disease text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_guidelines_title_trgm ON knowledge.guidelines USING gin (title gin_trgm_ops);

-- 中医：病种（TcmDiseaseTuple：病名,科属,西医对应,证型）
CREATE TABLE knowledge.tcm_diseases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease       text NOT NULL,
  category      text,
  western_ref   text,
  syndromes     text
);
-- 中医：中药材（HerbTuple：药名,性,味,归经,功效,常用剂量g,使用注意）
CREATE TABLE knowledge.tcm_herbs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  herb_name     text NOT NULL,
  nature        text,                            -- 性（寒/热/温/凉/平）
  flavor        text,                            -- 味（酸/苦/甘/辛/咸，/ 分隔）
  meridian      text,                            -- 归经
  effects       text,                            -- 功效
  dosage        text,                            -- 常用剂量 g
  caution       text                             -- 使用注意
);
-- 中医：方剂（FormulaTuple：方名,出处,组成,功效,主治,剂型/注意）
CREATE TABLE knowledge.tcm_formulas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_name  text NOT NULL,
  source        text,                            -- 出处
  composition   text,                            -- 组成
  effects       text,                            -- 功效
  indications   text,                            -- 主治
  caution       text                             -- 常用剂型/注意
);
-- 中医：穴位（AcupointTuple 4 字段）
CREATE TABLE knowledge.tcm_acupoints (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acupoint      text NOT NULL,
  meridian      text,
  location      text,
  indications   text
);
