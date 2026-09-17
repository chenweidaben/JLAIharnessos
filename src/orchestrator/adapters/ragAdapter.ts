/**
 * 健澜科技杠OS - 知识检索引擎适配器
 *
 * 将 knowledge/retrieval/RetrievalEngine（五阶段混合检索：查询理解→向量+BM25→
 * RRF 融合→医疗重排序→上下文构建）适配为编排层的 IRagRetriever。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { RetrievalEngine } from '../../knowledge/retrieval/RetrievalEngine.js';
import type { IRagRetriever, RagChunk, RagQuery } from '../engine/runtime.js';

/**
 * 检索引擎 -> 编排层 RAG 适配器
 */
export class RetrievalEngineRagAdapter implements IRagRetriever {
  /**
   * @param engine 知识检索引擎
   * @param knownKnowledgeBases 已知知识库名称集合（用于 hasKnowledgeBase 校验）
   */
  constructor(
    private readonly engine: RetrievalEngine,
    private readonly knownKnowledgeBases: Set<string> = new Set(),
  ) {}

  hasKnowledgeBase(name: string): boolean {
    // 未显式登记时默认放行（知识库可能由引擎侧统一管理）
    return this.knownKnowledgeBases.size === 0 || this.knownKnowledgeBases.has(name);
  }

  async retrieve(query: RagQuery): Promise<RagChunk[]> {
    const resp = await this.engine.retrieve(query.query, {
      topK: query.topK,
      minScore: query.scoreThreshold,
    });

    const chunks: RagChunk[] = (resp.results ?? []).map((r) => ({
      id: r.chunkId,
      content: r.content,
      // 相关性分数归一到 0-1（RetrievalResult.relevanceScore 通常已是 0-1）
      score: clamp01(r.relevanceScore ?? r.similarityScore ?? 0),
      source: r.publisher || r.knowledgeId || r.docTitle,
      title: r.docTitle,
      authorityLevel: authorityToLevel(r.authorityScore as number | undefined, r.publisher),
      metadata: {
        knowledgeId: r.knowledgeId,
        sectionPath: r.sectionPath,
        level: r.level,
        category: r.category,
        publisher: r.publisher,
        publishDate: r.publishDate,
        version: r.version,
        evidenceLevel: r.evidenceLevel,
        caution: r.caution,
      },
    }));

    let filtered = chunks.filter((c) => c.score >= query.scoreThreshold);
    if (query.authoritativeOnly) {
      filtered = filtered.filter((c) => c.authorityLevel && c.authorityLevel !== 'general');
    }
    return filtered.slice(0, query.topK);
  }
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** 权威星级（1-5）映射为编排层权威级别 */
function authorityToLevel(star: number | undefined, publisher?: string): string {
  if (star !== undefined) {
    if (star >= 5) return 'guideline';
    if (star >= 4) return 'standard';
    if (star >= 3) return 'textbook';
  }
  if (publisher && /药典|指南|规范|卫健委|医学会|WHO|FDA/i.test(publisher)) return 'guideline';
  return 'general';
}
