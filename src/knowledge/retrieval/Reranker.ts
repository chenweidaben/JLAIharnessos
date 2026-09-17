/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 检索结果重排序（Reranker）。
 * 预留 Cross-encoder 接口；当前为简化实现，基于相似度 + 权威性 + 时效性加权打分。
 * 医疗权威性排序：指南 > 教科书 > 药品说明书 > 文献 > 经验。
 */

import type { ScoredRecord } from '../types';
import { KNOWLEDGE_LEVELS } from '../types';

/** Cross-encoder 重打分器接口（生产环境注入真实模型） */
export interface CrossEncoderScorer {
  /**
   * 对查询-文档对打分
   *
   * @param query - 查询文本
   * @param document - 文档块内容
   * @returns 相关性分数（0-1）
   */
  score(query: string, document: string): Promise<number>;
}

/** 重排序后的候选结果 */
export interface RerankedCandidate extends ScoredRecord {
  /** 重排序综合分数 */
  finalScore: number;
  /** 时效权重分量（0-1） */
  timeliness: number;
  /** 权威性归一化分量（0-1） */
  authority: number;
  /** 可信度提示（经验知识等需标注） */
  caution?: string;
}

/** 重排序权重配置 */
export interface RerankWeights {
  /** 语义相似度权重 */
  similarity: number;
  /** 权威性权重 */
  authority: number;
  /** 时效性权重 */
  timeliness: number;
}

/** 默认权重（与 6.3.3 节综合评分公式对齐：相似度 0.6 / 权威 0.2 / 时效 0.2） */
const DEFAULT_WEIGHTS: RerankWeights = {
  similarity: 0.6,
  authority: 0.2,
  timeliness: 0.2,
};

/**
 * 计算文档发布日期的时效分（越新越高）。
 *
 * 1 年内 1.0，2 年内 0.8，3 年内 0.6，更久 0.4；超过 3 年额外提示过期。
 *
 * @param publishDate - 发布日期（YYYY-MM-DD）
 * @param now - 当前日期（Date）
 * @returns 时效分 0-1 与是否过期提示
 */
function timelinessScore(publishDate: string, now: Date): { score: number; stale: boolean } {
  const pub = new Date(publishDate).getTime();
  if (Number.isNaN(pub)) return { score: 0.5, stale: false };
  const years = (now.getTime() - pub) / (365.25 * 24 * 3600 * 1000);
  let score: number;
  let stale = false;
  if (years <= 1) score = 1.0;
  else if (years <= 2) score = 0.85;
  else if (years <= 3) score = 0.7;
  else {
    score = 0.4;
    stale = true;
  }
  return { score, stale };
}

/**
 * 医疗重排序器。
 *
 * 在召回候选基础上，综合语义相似度、知识权威性、时效性重新排序，
 * 并对经验知识 / 过期知识生成可信度提示。
 */
export class Reranker {
  /** 权重 */
  private readonly weights: RerankWeights;
  /** Cross-encoder 打分器（可空，生产环境注入） */
  private readonly crossEncoder?: CrossEncoderScorer;

  /**
   * 创建重排序器
   *
   * @param options - 权重与可选 Cross-encoder
   */
  constructor(options?: { weights?: Partial<RerankWeights>; crossEncoder?: CrossEncoderScorer }) {
    this.weights = { ...DEFAULT_WEIGHTS, ...(options?.weights ?? {}) };
    this.crossEncoder = options?.crossEncoder;
  }

  /**
   * 对候选结果重排序。
   *
   * @param query - 原始查询
   * @param candidates - 召回候选（带相似度）
   * @param now - 当前时间（便于测试注入）
   * @returns 重排序后的候选，按综合分数降序
   */
  async rerank(
    query: string,
    candidates: ScoredRecord[],
    now: Date = new Date(),
  ): Promise<RerankedCandidate[]> {
    const results: RerankedCandidate[] = [];

    for (const cand of candidates) {
      const meta = cand.record.metadata;
      const authority = (meta.authorityScore ?? 1) / 5;
      const { score: timeliness, stale } = timelinessScore(meta.publishDate, now);

      let similarity = cand.score;
      // 若注入 Cross-encoder，则用语义重打分替换相似度
      if (this.crossEncoder) {
        similarity = await this.crossEncoder.score(query, cand.record.content);
      }

      const finalScore =
        similarity * this.weights.similarity +
        authority * this.weights.authority +
        timeliness * this.weights.timeliness;

      let caution: string | undefined;
      // 经验知识必须标注
      if (meta.level === 'L5' || meta.sourceType === 'experience') {
        caution = '经验知识，仅供参考，不能作为唯一决策依据';
      } else if (stale) {
        caution = '该知识已超过3年未更新，请注意是否有新版本';
      }

      results.push({
        ...cand,
        finalScore,
        timeliness,
        authority,
        caution,
      });
    }

    results.sort((a, b) => b.finalScore - a.finalScore);
    return results;
  }
}

/**
 * 根据知识层级获取权威性权重（供外部复用）。
 *
 * @param level - 知识层级
 * @returns 权威性权重 1-5
 */
export function levelAuthorityWeight(level: keyof typeof KNOWLEDGE_LEVELS): number {
  return KNOWLEDGE_LEVELS[level].authorityWeight;
}
