/**
 * 健澜科技 jlmedaios - RAG 知识库检索优化 V5 纯函数（M280-C）
 *
 * embedQueryV5 / hybridSearchV5 / rerankV5 / buildRagTuningV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 检索结果 */
export interface RagResult {
  docId: string;
  chunkId: string;
  vectorScore: number;
  keywordScore: number;
  finalScore: number;
}

/**
 * 查询向量化 V5（纯函数）：演示用简单字符哈希模拟 embedding 维度。
 *
 * @param text 查询文本
 * @returns 模拟向量（4维，长度归一）
 */
export function embedQueryV5(text: string): number[] {
  const vec = [0, 0, 0, 0];
  for (let i = 0; i < text.length; i++) {
    vec[i % 4] += text.charCodeAt(i);
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => Math.round((v / norm) * 1000) / 1000);
}

/**
 * 混合检索 V5（纯函数）：向量分×0.7 + 关键词分×0.3。
 *
 * @param results 候选结果
 * @returns 带混合分的结果
 */
export function hybridSearchV5(results: { docId: string; chunkId: string; vectorScore: number; keywordScore: number }[]): RagResult[] {
  return results.map((r) => ({
    docId: r.docId,
    chunkId: r.chunkId,
    vectorScore: r.vectorScore,
    keywordScore: r.keywordScore,
    finalScore: Math.round((r.vectorScore * 0.7 + r.keywordScore * 0.3) * 1000) / 1000,
  }));
}

/**
 * 重排 V5（纯函数）：按 finalScore 降序，取 topK。
 *
 * @param results 检索结果
 * @param topK 返回数量
 * @returns 重排后结果
 */
export function rerankV5(results: RagResult[], topK: number): RagResult[] {
  return [...results].sort((a, b) => b.finalScore - a.finalScore).slice(0, topK);
}

/** RAG 调优看板输出 */
export interface RagTuningV5Report {
  totalChunks: number;
  avgHitRate: number;
  topK: number;
  suggestions: string[];
}

/**
 * 构建 RAG 调优看板（纯函数）。
 *
 * @param chunks 分块检索命中统计
 * @param topK 配置返回数
 * @returns 看板
 */
export function buildRagTuningV5Report(
  chunks: { retrievalCount: number; hit: boolean }[],
  topK: number,
): RagTuningV5Report {
  const totalRetrievals = chunks.reduce((s, c) => s + c.retrievalCount, 0);
  const hits = chunks.filter((c) => c.hit).length;
  const avgHitRate = chunks.length > 0
    ? Math.round((hits / chunks.length) * 1000) / 10
    : 0;
  return {
    totalChunks: chunks.length,
    avgHitRate,
    topK,
    suggestions: avgHitRate < 70
      ? ["命中率低于70%，建议优化分块策略与embedding模型"]
      : ["RAG检索稳定，持续监控漂移"],
  };
}
