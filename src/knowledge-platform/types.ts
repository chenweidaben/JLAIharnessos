/**
 * 健澜科技杠OS（GangOS / Jianlan OS）— 医疗知识中台领域模型
 *
 * 设计目标：
 *  - 统一描述「多源接入 → 加工流水线 → 知识图谱 → 混合检索 → 多租户/版本」全链路；
 *  - 与既有 src/knowledge（RAG 运行时）解耦，可独立被编排层、低代码平台、Agent 工具调用；
 *  - 所有结构化术语条目（ICD/LOINC/SNOMED/药品/检验等）共享统一编码与来源溯源字段。
 *
 * 免责声明：本平台为医疗辅助工具，不替代医生诊断与处方决策。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// 0. 通用：来源、许可、租户、审计
// ============================================================================

/** 权威开放医疗知识库标识（与 scripts/knowledge、DATA_LICENSES.md 对齐） */
export type CanonicalSourceId =
  | 'icd10-cn' // 国标版 ICD-10（国家医保/卫健委疾病分类与代码）
  | 'icd9-cm3-cn' // 国标手术操作分类 ICD-9-CM-3
  | 'loinc' // LOINC 检验观察项
  | 'snomed-ct' // SNOMED CT（需注册，UMLS/各会员区）
  | 'rxnorm' // RxNorm 药品通用名
  | 'atc' // WHO ATC 解剖治疗化学分类
  | 'mesh' // MeSH 医学主题词
  | 'cmekg' // CMeKG 中文医学知识图谱
  | 'tcm-mkg' // 中医药知识图谱
  | 'medct' // MedCT 中文临床术语
  | 'clinical-pathway-cn' // 国家临床路径
  | 'essential-drug-cn' // 国家基本药物目录
  | 'medical-insurance-drug-cn' // 国家医保药品目录
  | 'cde-label' // CDE 药品说明书入口
  | 'opendrg' // OpenDRG（Apache-2.0）CHS-DRG 分组器
  | 'meddialog' // MedDialog 医患对话数据集
  | 'cn-medical-dialogue' // Chinese-medical-dialogue-data
  | 'chembl' // ChEMBL 药物分子/活性
  | 'drug-interaction' // 药物相互作用开放数据
  | 'pubmed-kb' // PubMed 知识索引
  | 'tcm-formula' // 中医方剂库
  | 'tcm-herb' // 中药库
  | 'tcm-acupuncture' // 针灸腧穴库
  | 'custom'; // 医院/个人自建

/** 数据来源溯源信息 */
export interface SourceProvenance {
  /** 规范库标识 */
  sourceId: CanonicalSourceId | string;
  /** 来源名称（中文） */
  sourceName: string;
  /** 数据版本/发布批次，如 2024 版 */
  version?: string;
  /** 发布机构 */
  publisher?: string;
  /** 原始 URL */
  url?: string;
  /** 许可证 SPDX 标识或专有说明，如 CC-BY-4.0 / Apache-2.0 / 需注册 */
  license: string;
  /** 获取/更新时间 ISO8601 */
  fetchedAt: string;
  /** 校验和（sha256），用于可重复下载与完整性校验 */
  checksum?: string;
}

/** 多租户隔离层级 */
export type TenantScope = 'public' | 'hospital' | 'department' | 'personal';

/** 租户/空间 */
export interface Tenant {
  id: string;
  scope: TenantScope;
  /** 医院/科室/个人名称 */
  name: string;
  /** 上级租户 id（科室→医院） */
  parentId?: string;
  createdAt: string;
}

// ============================================================================
// 1. 多源接入器
// ============================================================================

export type ConnectorKind = 'file' | 'api' | 'database' | 'crawler' | 'terminology';

/** 通用接入配置（按 kind 取用对应字段） */
export interface ConnectorConfig {
  id: string;
  name: string;
  kind: ConnectorKind;
  /** file: 路径/glob；api: 端点；database: 连接串引用；crawler: 起始 URL */
  target: string;
  /** api: HTTP 方法与头 */
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  /** database: SQL（仅允许参数化只读查询） */
  sql?: string;
  /** crawler: 抓取深度与域名白名单 */
  maxDepth?: number;
  allowedDomains?: string[];
  /** 分页/限流 */
  pageSize?: number;
  rateLimitPerSec?: number;
  /** 附加元数据 */
  metadata?: Record<string, unknown>;
  enabled: boolean;
}

/** 接入器拉取到的原始文档（尚未加工） */
export interface RawDocument {
  id: string;
  /** 知识库 id */
  knowledgeBaseId: string;
  title: string;
  /** 原始文本或二进制占位（文件路径） */
  content: string;
  format: 'txt' | 'md' | 'pdf' | 'docx' | 'xlsx' | 'csv' | 'html' | 'json';
  sourceUrl?: string;
  author?: string;
  language?: string;
  createdAt: string;
  provenance: SourceProvenance;
  /** 租户隔离标记 */
  tenantId: string;
  tags: string[];
}

// ============================================================================
// 2. 加工流水线
// ============================================================================

/** 切分策略 */
export type ChunkStrategy =
  | 'fixed' // 定长 + overlap
  | 'sentence' // 句子边界
  | 'section' // 按标题/章节
  | 'structure'; // 结构化记录（术语/药品一条为一块）

export interface ChunkOptions {
  strategy: ChunkStrategy;
  /** 目标块大小（字符） */
  chunkSize?: number;
  overlap?: number;
  /** section 策略的标题层级正则 */
  headingPattern?: string;
}

/** 加工后的知识块（文档型） */
export interface KnowledgeChunk {
  id: string;
  documentId: string;
  knowledgeBaseId: string;
  content: string;
  /** 章节路径 */
  sectionPath?: string;
  chunkIndex: number;
  tokens: number;
  /** 向量（维度由 encoder 决定）；结构化术语可能为空 */
  vector?: number[];
  entities: string[];
  metadata: Record<string, unknown>;
  provenance: SourceProvenance;
  tenantId: string;
}

/** 流水线阶段名（用于进度与质量报告） */
export type PipelineStage =
  | 'parse'
  | 'clean'
  | 'split'
  | 'normalize'
  | 'entity'
  | 'relation'
  | 'embed'
  | 'ingest';

export interface PipelineReport {
  documentId: string;
  startedAt: string;
  finishedAt?: string;
  stages: Partial<Record<PipelineStage, { ms: number; ok: boolean; message?: string }>>;
  chunks: number;
  entities: number;
  relations: number;
  qualityScore: number;
}

// ============================================================================
// 3. 知识图谱
// ============================================================================

/** 实体类型（覆盖临床/药物/检验/中医） */
export type EntityType =
  | 'disease' // 疾病
  | 'symptom' // 症状
  | 'drug' // 药物
  | 'ingredient' // 化学成分
  | 'examination' // 检查检验
  | 'procedure' // 手术操作
  | 'department' // 科室
  | 'body_part' // 部位
  | 'pathogen' // 病原体
  | 'tcm_syndrome' // 中医证候
  | 'tcm_herb' // 中药
  | 'tcm_formula' // 方剂
  | 'acupoint' // 腧穴
  | 'guideline' // 指南/路径
  | 'other';

export interface GraphEntity {
  id: string;
  /** 规范名 */
  name: string;
  type: EntityType;
  /** 同义词/别名 */
  aliases: string[];
  /** 标准编码：ICD/LOINC/ATC/RxNorm 等 */
  codes: Partial<Record<'icd10' | 'icd9cm3' | 'loinc' | 'snomed' | 'rxnorm' | 'atc' | 'mesh', string>>;
  properties: Record<string, string | number | boolean>;
  provenance: SourceProvenance;
}

export interface GraphRelation {
  id: string;
  fromId: string;
  toId: string;
  /** 关系类型，如 treats（治疗）、causes（导致）、has_symptom、interacts_with、contraindicates、belongs_to */
  type: string;
  /** 关系权重/置信度 0-1 */
  weight: number;
  properties?: Record<string, string | number | boolean>;
  provenance: SourceProvenance;
}

// ============================================================================
// 4. 结构化术语条目（种子/权威库统一形态）
// ============================================================================

export interface TermEntry {
  /** 全局稳定唯一 ID，如 icd10:I10.x00 */
  id: string;
  sourceId: CanonicalSourceId | string;
  /** 主编码 */
  code: string;
  /** 规范中文名 */
  name: string;
  /** 英文名 */
  nameEn?: string;
  /** 同义词（含曾用名、俗称） */
  synonyms: string[];
  /** 上级编码（构建分类树） */
  parentCode?: string;
  /** 条目类别（章/节/类目/亚目/细目） */
  kind?: string;
  /** 领域标签：内科/外科/药品/检验/中医等 */
  domain?: string;
  /** 富字段，不同库各自定义（剂型/规格/参考范围/危急值等） */
  fields: Record<string, unknown>;
  provenance: SourceProvenance;
}

// ============================================================================
// 5. 知识库（KB）与检索
// ============================================================================

export type KnowledgeBaseKind =
  | 'document' // 文档 RAG 库
  | 'terminology' // 术语库
  | 'graph' // 图谱库
  | 'mixed';

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  kind: KnowledgeBaseKind;
  category: string;
  tenantId: string;
  /** 切分配置 */
  chunk: ChunkOptions;
  /** 检索参数 */
  retrieval: {
    topK: number;
    candidateK: number;
    /** 向量/关键词/图谱三路权重（和为 1） */
    weights: { vector: number; keyword: number; graph: number };
    /** 相似度阈值 */
    minScore: number;
    /** RRF 常数 k */
    rrfK: number;
  };
  /** 绑定的规范来源 */
  sources: string[];
  documentCount: number;
  chunkCount: number;
  /** 索引状态 */
  indexStatus: 'empty' | 'indexing' | 'ready' | 'error';
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** 文档加工/上传任务状态 */
export interface DocumentIndexStatus {
  documentId: string;
  knowledgeBaseId: string;
  fileName: string;
  stage: PipelineStage | 'done' | 'failed';
  progress: number;
  message?: string;
  updatedAt: string;
}

/** 单路召回结果 */
export interface RetrievalHit {
  /** chunk id 或 term id 或 graph 节点 id */
  id: string;
  kind: 'chunk' | 'term' | 'graph';
  content: string;
  title: string;
  score: number;
  /** 引用追溯 */
  provenance: SourceProvenance;
  sectionPath?: string;
  /** 图谱关系说明 */
  graphPath?: string;
  metadata?: Record<string, unknown>;
}

export interface RetrievalResponse {
  query: string;
  rewrittenQuery: string;
  hits: RetrievalHit[];
  /** 各路召回数与融合信息，便于调试 */
    debug: {
    vectorCandidates: number;
    keywordCandidates: number;
    graphCandidates: number;
    latencyMs: number;
  };
}

/** 术语标准化结果 */
export interface StandardizationResult {
  raw: string;
  matched: boolean;
  canonicalName?: string;
  code?: string;
  sourceId?: string;
  confidence: number;
  candidates: Array<{ name: string; code: string; sourceId: string; score: number }>;
}

// ============================================================================
// 6. 版本、质量、增量
// ============================================================================

export interface DatasetVersion {
  sourceId: string;
  version: string;
  recordCount: number;
  checksum: string;
  importedAt: string;
  notes?: string;
}

export interface QualityReport {
  scope: string;
  total: number;
  /** 编码唯一性 */
  uniqueCodes: number;
  duplicateCodes: number;
  /** 字段完整率（0-1） */
  fieldCompleteness: number;
  /** 重复/缺失/异常明细（仅记录数量与示例） */
  issues: Array<{ type: string; count: number; sample?: string }>;
  score: number;
}
