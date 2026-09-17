/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 知识库与 RAG 领域共享类型定义。
 * 涵盖五级知识分层、知识来源类型、向量记录、检索过滤器、检索结果等核心模型，
 * 供向量存储、文档处理、检索引擎、知识库管理与 CDS 工具共用。
 */

// ============================================================
// 五级知识分层
// ============================================================

/**
 * 知识库五级分层（与《数据模型与知识库设计》5.1 节一致）。
 * L1 基础医学 → L2 临床指南与路径 → L3 医院本地知识 → L4 专科知识 → L5 经验知识。
 */
export type KnowledgeLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

/** 知识分层元信息 */
export interface KnowledgeLevelInfo {
  /** 层级标识 */
  level: KnowledgeLevel;
  /** 中文名称 */
  name: string;
  /** 权威性权重（1-5，越大越权威） */
  authorityWeight: number;
  /** 更新频率说明 */
  updateFrequency: string;
}

/** 五级分层元信息表 */
export const KNOWLEDGE_LEVELS: Readonly<Record<KnowledgeLevel, KnowledgeLevelInfo>> = {
  L1: {
    level: 'L1',
    name: '基础医学',
    authorityWeight: 5,
    updateFrequency: '年度（教材版本更新）',
  },
  L2: {
    level: 'L2',
    name: '临床指南与路径',
    authorityWeight: 5,
    updateFrequency: '官方发布后及时更新',
  },
  L3: { level: 'L3', name: '医院本地知识', authorityWeight: 4, updateFrequency: '月度更新' },
  L4: { level: 'L4', name: '专科知识', authorityWeight: 3, updateFrequency: '季度更新' },
  L5: {
    level: 'L5',
    name: '经验知识',
    authorityWeight: 2,
    updateFrequency: '持续沉淀（经审核后纳入）',
  },
};

// ============================================================
// 知识来源类型
// ============================================================

/** 知识来源类型 */
export type SourceType =
  | 'official_guideline' // 官方指南（国家卫健委/中华医学会/国际指南）
  | 'textbook' // 权威教材
  | 'drug_label' // 药品说明书
  | 'hospital_policy' // 医院制度/规程
  | 'clinical_pathway' // 临床路径
  | 'expert_consensus' // 专家共识
  | 'literature' // 文献
  | 'experience'; // 经验知识

/** 知识分类（文档类型） */
export type DocumentCategory =
  '临床指南' | '药品说明书' | '医院制度' | '临床路径' | '专家共识' | '教材' | '文献' | '经验总结';

/** 来源权威性等级（1-5，与 6.7.3 节对应） */
export type AuthorityStar = 1 | 2 | 3 | 4 | 5;

// ============================================================
// 文档/分块元数据
// ============================================================

/** 文档位置信息（相对于源文档字符偏移） */
export interface DocumentPosition {
  /** 起始字符偏移 */
  start: number;
  /** 结束字符偏移 */
  end: number;
}

/**
 * 分块元数据。
 * 携带章节路径、证据等级等医疗检索关键信息，用于重排序与证据追溯。
 */
export interface ChunkMetadata {
  /** 章节路径（如 "高血压防治指南 > 诊断和评估 > 诊断标准"） */
  sectionPath: string;
  /** 当前块在文档中的序号（从 0 开始） */
  chunkIndex: number;
  /** 文档总分块数 */
  totalChunks: number;
  /** 证据等级（A/B/C/D 或 I/II/III），可空 */
  evidenceLevel?: string;
  /** 推荐意见分级（I/IIa/IIb/III），可空 */
  recommendationClass?: string;
  /** 是否为独立推荐意见块 */
  isRecommendation?: boolean;
  /** 标签 */
  tags: string[];
}

// ============================================================
// 向量存储记录与过滤器
// ============================================================

/** 向量记录附带的元数据（存储于向量库，支持过滤与重排序） */
export interface VectorMetadata {
  /** 知识源 ID */
  knowledgeId: string;
  /** 分块 ID */
  chunkId: string;
  /** 文档标题 */
  docTitle: string;
  /** 章节路径（如 "指南 > 诊断 > 诊断标准"） */
  sectionPath: string;
  /** 知识层级 L1-L5 */
  level: KnowledgeLevel;
  /** 文档分类 */
  category: DocumentCategory;
  /** 来源类型 */
  sourceType: SourceType;
  /** 关联科室（如心内科），可空 */
  department?: string;
  /** 发布日期（ISO 8601，YYYY-MM-DD） */
  publishDate: string;
  /** 版本号（语义化，如 v3.0.0） */
  version: string;
  /** 权威性评分（1-5） */
  authorityScore: AuthorityStar;
  /** 证据等级，可空 */
  evidenceLevel?: string;
  /** 标签 */
  tags: string[];
  /** 是否有效（过期/作废为 false） */
  isActive: boolean;
}

/** 向量记录（内容 + 向量 + 元数据） */
export interface VectorRecord {
  /** 分块 ID（唯一） */
  id: string;
  /** 分块文本内容 */
  content: string;
  /** 向量（维度由 EmbeddingService 决定） */
  vector: number[];
  /** 元数据 */
  metadata: VectorMetadata;
}

/**
 * 结构化元数据过滤器。
 * 所有条件为 AND 关系；数组字段内部为 OR 关系。
 */
export interface MetadataFilter {
  /** 限定科室 */
  departments?: string[];
  /** 限定文档分类 */
  categories?: DocumentCategory[];
  /** 限定来源类型 */
  sourceTypes?: SourceType[];
  /** 限定知识层级 */
  levels?: KnowledgeLevel[];
  /** 限定标签（包含任一即可） */
  tags?: string[];
  /** 发布日期下界（YYYY-MM-DD，含） */
  dateFrom?: string;
  /** 发布日期上界（YYYY-MM-DD，含） */
  dateTo?: string;
  /** 仅返回有效知识（默认 true） */
  activeOnly?: boolean;
}

/** 单条向量检索结果 */
export interface ScoredRecord {
  /** 命中的向量记录 */
  record: VectorRecord;
  /** 相似度分数（余弦相似度，0-1） */
  score: number;
}

// ============================================================
// 检索查询与结果
// ============================================================

/** 查询意图分类 */
export type QueryIntent =
  | 'diagnosis' // 诊断
  | 'treatment' // 治疗
  | 'medication' // 用药
  | 'examination' // 检验检查
  | 'procedure' // 操作
  | 'management' // 管理/制度
  | 'general'; // 通用/无法归类

/** 查询理解结果 */
export interface QueryUnderstandingResult {
  /** 原始查询 */
  originalQuery: string;
  /** 改写后查询（含同义词扩展） */
  rewrittenQuery: string;
  /** 扩展后的关键词（去重） */
  keywords: string[];
  /** 查询意图 */
  intent: QueryIntent;
  /** 从查询生成的结构化过滤器 */
  filter: MetadataFilter;
}

/** 单条最终检索结果（供 LLM 上下文使用） */
export interface RetrievalResult {
  /** 分块 ID */
  chunkId: string;
  /** 知识源 ID */
  knowledgeId: string;
  /** 文档标题 */
  docTitle: string;
  /** 分块内容 */
  content: string;
  /** 章节路径 */
  sectionPath: string;
  /** 知识层级 */
  level: KnowledgeLevel;
  /** 文档分类 */
  category: DocumentCategory;
  /** 发布机构 */
  publisher: string;
  /** 发布日期 */
  publishDate: string;
  /** 版本号 */
  version: string;
  /** 权威性评分（1-5） */
  authorityScore: AuthorityStar;
  /** 证据等级 */
  evidenceLevel?: string;
  /** 综合相关性分数（重排序后） */
  relevanceScore: number;
  /** 原始向量相似度 */
  similarityScore: number;
  /** 来源可信度提示（如经验知识标注"仅供参考"） */
  caution?: string;
}

/** 检索请求选项 */
export interface RetrievalOptions {
  /** 返回数量（默认 Top-5） */
  topK?: number;
  /** 召回候选数（默认 Top-30） */
  candidateK?: number;
  /** 知识层级过滤 */
  knowledgeLevel?: KnowledgeLevel;
  /** 科室过滤 */
  department?: string;
  /** 文档类型过滤 */
  documentType?: DocumentCategory;
  /** 相似度阈值（低于则过滤） */
  minScore?: number;
}

/** 上下文 token 预算默认值 */
export const DEFAULT_CONTEXT_TOKEN_BUDGET = 1800;

/**
 * 估算文本 token 数（轻量启发式，纯 JS 实现）。
 * 中文按字符计，连续英文/数字按词计，近似 BPE 分词。
 *
 * @param text - 待估算文本
 * @returns 估算 token 数（向上取整）
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  let tokens = 0;
  // 匹配 CJK 字符（每字约 1 token）与连续拉丁数字串（每串约 1 token）
  const cjk = text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g);
  const words = text.match(/[A-Za-z0-9]+/g);
  tokens += cjk ? cjk.length : 0;
  tokens += words ? words.length : 0;
  // 标点与其余字符按 0.5 token 近似
  const nonCjkNonWord = text.length - (cjk ? cjk.length : 0) - (words ? words.join('').length : 0);
  tokens += Math.max(0, Math.round(nonCjkNonWord * 0.5));
  return Math.max(1, tokens);
}
