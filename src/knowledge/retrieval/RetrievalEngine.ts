/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * RAG 检索引擎（Retrieval Engine）。
 * 五阶段流水线：查询理解 → 混合检索（向量 + 关键词 BM25 + 结构化过滤）
 * → RRF 结果融合 → 医疗重排序 → 上下文构建。
 */

import type {
  MetadataFilter,
  QueryUnderstandingResult,
  RetrievalOptions,
  RetrievalResult,
  ScoredRecord,
  VectorMetadata,
  VectorRecord,
} from '../types';
import type { EmbeddingService } from '../vector/EmbeddingService';
import { tokenize } from '../vector/EmbeddingService';
import type { VectorStore } from '../vector/VectorStore';
import { type BuiltContext, ContextBuilder } from './ContextBuilder';
import { QueryUnderstanding } from './QueryUnderstanding';
import { type RerankedCandidate, Reranker } from './Reranker';

/** 引擎构造参数 */
export interface RetrievalEngineOptions {
  /** 嵌入服务 */
  embeddingService: EmbeddingService;
  /** 向量存储 */
  vectorStore: VectorStore;
  /** 重排序器（可选，默认内部构造） */
  reranker?: Reranker;
  /** 上下文构建器（可选） */
  contextBuilder?: ContextBuilder;
  /** 查询理解器（可选） */
  queryUnderstanding?: QueryUnderstanding;
  /** 根据 knowledgeId 解析发布机构（用于证据追溯） */
  publisherResolver?: (knowledgeId: string) => string;
}

/** 检索完整结果 */
export interface RetrievalResponse {
  /** 查询理解结果 */
  understanding: QueryUnderstandingResult;
  /** 最终检索结果（已重排序、Top-N） */
  results: RetrievalResult[];
  /** 构建好的 LLM 上下文 */
  context: BuiltContext;
}

/** RRF 融合常数（Reciprocal Rank Fusion 默认 k=60） */
const RRF_K = 60;

/** BM25 参数 */
const BM25_K1 = 1.5;
const BM25_B = 0.75;

/**
 * 构建 corpus 级别的 BM25 统计（DF / 平均文档长度）。
 */
interface Bm25Stats {
  /** 文档数 */
  n: number;
  /** 词 → 文档频率 */
  df: Map<string, number>;
  /** 平均文档长度（词元数） */
  avgDl: number;
  /** 每篇文档的词元频率 */
  docTf: { record: VectorRecord; tf: Map<string, number>; dl: number }[];
}

/**
 * 构建 BM25 语料统计。
 *
 * @param records - 语料记录
 * @returns BM25 统计
 */
function buildBm25Stats(records: readonly VectorRecord[]): Bm25Stats {
  const df = new Map<string, number>();
  const docTf: Bm25Stats['docTf'] = [];
  let totalDl = 0;

  for (const rec of records) {
    const tokens = tokenize(rec.content);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const dl = tokens.length;
    totalDl += dl;
    for (const term of tf.keys()) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
    docTf.push({ record: rec, tf, dl });
  }

  return {
    n: records.length,
    df,
    avgDl: records.length > 0 ? totalDl / records.length : 1,
    docTf,
  };
}

/**
 * 计算单篇文档对查询的 BM25 分数。
 *
 * @param stats - 语料统计
 * @param queryTerms - 查询词元
 * @param doc - 文档
 * @returns BM25 分数
 */
function bm25Score(
  stats: Bm25Stats,
  queryTerms: string[],
  doc: Bm25Stats['docTf'][number],
): number {
  let score = 0;
  const { n, df, avgDl } = stats;
  for (const term of queryTerms) {
    const tf = doc.tf.get(term) ?? 0;
    if (tf === 0) continue;
    const dfi = df.get(term) ?? 0;
    // IDF（BM25 标准公式，加 1 避免负值）
    const idf = Math.log(1 + (n - dfi + 0.5) / (dfi + 0.5));
    const dlNorm = 1 - BM25_B + BM25_B * (doc.dl / (avgDl || 1));
    score += (idf * (tf * (BM25_K1 + 1))) / (tf + BM25_K1 * dlNorm);
  }
  return score;
}

/**
 * RAG 检索引擎。
 *
 * 串联查询理解、混合检索、RRF 融合、重排序与上下文构建，
 * 输出带证据追溯的结构化检索结果，供 CDS 工具与 Agent 使用。
 */
export class RetrievalEngine {
  private readonly embeddingService: EmbeddingService;
  private readonly vectorStore: VectorStore;
  private readonly reranker: Reranker;
  private readonly contextBuilder: ContextBuilder;
  private readonly queryUnderstanding: QueryUnderstanding;
  private readonly publisherResolver: (knowledgeId: string) => string;

  /**
   * 创建检索引擎
   *
   * @param options - 引擎依赖
   */
  constructor(options: RetrievalEngineOptions) {
    this.embeddingService = options.embeddingService;
    this.vectorStore = options.vectorStore;
    this.reranker = options.reranker ?? new Reranker();
    this.contextBuilder = options.contextBuilder ?? new ContextBuilder();
    this.queryUnderstanding = options.queryUnderstanding ?? new QueryUnderstanding();
    this.publisherResolver = options.publisherResolver ?? ((kid: string) => `未知来源(${kid})`);
  }

  /**
   * 执行完整检索流水线。
   *
   * @param query - 自然语言查询
   * @param options - 检索选项（TopK、层级、科室、文档类型等）
   * @returns 检索结果与上下文
   */
  async retrieve(query: string, options: RetrievalOptions = {}): Promise<RetrievalResponse> {
    const topK = options.topK ?? 5;
    const candidateK = options.candidateK ?? 30;

    // 组合基础过滤器：外部显式过滤优先
    const baseFilter: MetadataFilter = {};
    if (options.knowledgeLevel) baseFilter.levels = [options.knowledgeLevel];
    if (options.department) baseFilter.departments = [options.department];
    if (options.documentType) baseFilter.categories = [options.documentType];

    // 阶段1：查询理解
    const understanding = this.queryUnderstanding.understand(query, baseFilter);
    // 合并理解阶段生成的过滤器（不覆盖外部显式条件）
    const mergedFilter: MetadataFilter = {
      ...understanding.filter,
      levels: baseFilter.levels ?? understanding.filter.levels,
      departments: baseFilter.departments ?? understanding.filter.departments,
      categories: baseFilter.categories ?? understanding.filter.categories,
      activeOnly: true,
    };

    // 阶段2：混合检索
    const candidates = await this.hybridRetrieve(
      understanding.rewrittenQuery,
      understanding.keywords,
      mergedFilter,
      candidateK,
      options.minScore,
    );

    // 阶段3：重排序
    const reranked = await this.reranker.rerank(query, candidates);
    const topCandidates = reranked.slice(0, topK);

    // 阶段4/5：组装为 RetrievalResult 并构建上下文
    const results = topCandidates.map((c) => this.toRetrievalResult(c));
    const context = this.contextBuilder.build(results);

    return { understanding, results, context };
  }

  /**
   * 混合检索：向量检索 + BM25 关键词检索，RRF 融合。
   *
   * @param rewrittenQuery - 改写后查询（用于向量）
   * @param keywords - 关键词（用于 BM25）
   * @param filter - 元数据过滤器
   * @param candidateK - 候选数
   * @param minScore - 相似度阈值
   * @returns 融合后的候选（带向量相似度分）
   */
  private async hybridRetrieve(
    rewrittenQuery: string,
    keywords: string[],
    filter: MetadataFilter,
    candidateK: number,
    minScore?: number,
  ): Promise<ScoredRecord[]> {
    // 2a. 向量检索
    const queryVec = await this.embeddingService.embed(rewrittenQuery);
    const vectorHits = await this.vectorStore.search(queryVec, candidateK, {
      filter,
      minScore: minScore ?? 0,
    });

    // 2b. BM25 关键词检索（在过滤后的语料上计算）
    const allRecords = await this.vectorStore.listAll();
    const filtered = allRecords.filter((r) => this.passFilter(r.metadata, filter));
    const stats = buildBm25Stats(filtered);
    const queryTerms = keywords.length > 0 ? keywords : tokenize(rewrittenQuery);

    const bm25Ranked: { record: VectorRecord; score: number }[] = filtered
      .map((doc) => ({
        record: doc,
        score: bm25Score(
          stats,
          queryTerms,
          stats.docTf.find((d) => d.record.id === doc.id)!,
        ),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, candidateK);

    // 2c. RRF 融合
    return this.rrfFuse(vectorHits, bm25Ranked, candidateK);
  }

  /**
   * RRF（Reciprocal Rank Fusion）融合两路排序。
   *
   * score = Σ 1/(k + rank_i)
   * 融合后仍保留原始向量相似度作为 score 字段（供重排序使用）。
   *
   * @param vectorHits - 向量检索排序
   * @param bm25Hits - BM25 排序
   * @param candidateK - 候选数
   * @returns 融合候选
   */
  private rrfFuse(
    vectorHits: ScoredRecord[],
    bm25Hits: { record: VectorRecord; score: number }[],
    candidateK: number,
  ): ScoredRecord[] {
    const fused = new Map<string, { record: VectorRecord; rrf: number; vectorScore: number }>();

    vectorHits.forEach((hit, rank) => {
      const cur = fused.get(hit.record.id) ?? {
        record: hit.record,
        rrf: 0,
        vectorScore: hit.score,
      };
      cur.rrf += 1 / (RRF_K + rank + 1);
      cur.vectorScore = hit.score;
      fused.set(hit.record.id, cur);
    });

    bm25Hits.forEach((hit, rank) => {
      const cur = fused.get(hit.record.id) ?? {
        record: hit.record,
        rrf: 0,
        vectorScore: 0,
      };
      cur.rrf += 1 / (RRF_K + rank + 1);
      fused.set(hit.record.id, cur);
    });

    return Array.from(fused.values())
      .sort((a, b) => b.rrf - a.rrf)
      .slice(0, candidateK)
      .map((x) => ({ record: x.record, score: x.vectorScore }));
  }

  /**
   * 将重排序候选转换为最终 RetrievalResult。
   *
   * @param cand - 重排序候选
   * @returns 检索结果
   */
  private toRetrievalResult(cand: RerankedCandidate): RetrievalResult {
    const meta = cand.record.metadata;
    return {
      chunkId: meta.chunkId,
      knowledgeId: meta.knowledgeId,
      docTitle: meta.docTitle,
      content: cand.record.content,
      sectionPath: meta.sectionPath || meta.docTitle,
      level: meta.level,
      category: meta.category,
      publisher: this.publisherResolver(meta.knowledgeId),
      publishDate: meta.publishDate,
      version: meta.version,
      authorityScore: meta.authorityScore,
      evidenceLevel: meta.evidenceLevel,
      relevanceScore: cand.finalScore,
      similarityScore: cand.score,
      caution: cand.caution,
    };
  }

  /**
   * 元数据过滤（与 LocalVectorStore.matchesFilter 一致，用于 BM25 前的语料过滤）。
   *
   * @param meta - 元数据
   * @param filter - 过滤器
   * @returns 是否通过
   */
  private passFilter(meta: VectorMetadata, filter: MetadataFilter): boolean {
    if (filter.activeOnly !== false && meta.isActive === false) return false;
    if (filter.levels && !filter.levels.includes(meta.level)) return false;
    if (filter.categories && !filter.categories.includes(meta.category)) return false;
    if (filter.sourceTypes && !filter.sourceTypes.includes(meta.sourceType)) return false;
    if (filter.departments && (!meta.department || !filter.departments.includes(meta.department))) {
      return false;
    }
    if (filter.tags && filter.tags.length > 0) {
      const overlap = filter.tags.some((t) => meta.tags.includes(t));
      if (!overlap) return false;
    }
    if (filter.dateFrom && meta.publishDate < filter.dateFrom) return false;
    if (filter.dateTo && meta.publishDate > filter.dateTo) return false;
    return true;
  }
}
