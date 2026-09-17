/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 本地向量存储实现（开发环境用）。
 * 基于内存 Map + JSON 文件持久化，纯 JS 实现余弦相似度计算。
 * 生产环境可无缝替换为 PostgreSQL + pgvector / Milvus。
 */

import { promises as fs } from 'fs';

import type { MetadataFilter, ScoredRecord, VectorMetadata, VectorRecord } from '../types';
import type { VectorStore, VectorStoreStats } from './VectorStore';

/**
 * 计算两个向量的余弦相似度。
 *
 * 输入向量应为 L2 归一化向量；若未归一化，本函数仍按余弦公式计算。
 * 结果范围 [-1, 1]，语义检索中通常落在 [0, 1]。
 *
 * @param a - 向量 a
 * @param b - 向量 b
 * @returns 余弦相似度
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 判断元数据是否满足过滤器条件。
 *
 * 所有顶层条件为 AND 关系；数组字段内部为 OR 关系。
 *
 * @param meta - 向量记录元数据
 * @param filter - 元数据过滤器
 * @returns 是否通过
 */
function matchesFilter(meta: VectorMetadata, filter: MetadataFilter): boolean {
  // 有效性过滤
  if (filter.activeOnly !== false && meta.isActive === false) {
    // 默认 activeOnly=true；显式传 false 才允许返回无效记录
    return false;
  }
  if (filter.levels && !filter.levels.includes(meta.level)) return false;
  if (filter.categories && !filter.categories.includes(meta.category)) {
    return false;
  }
  if (filter.sourceTypes && !filter.sourceTypes.includes(meta.sourceType)) {
    return false;
  }
  if (filter.departments) {
    if (!meta.department || !filter.departments.includes(meta.department)) {
      return false;
    }
  }
  if (filter.tags && filter.tags.length > 0) {
    const overlap = filter.tags.some((t) => meta.tags.includes(t));
    if (!overlap) return false;
  }
  // 日期范围过滤（字符串 ISO 比较即等价于日期比较）
  if (filter.dateFrom && meta.publishDate < filter.dateFrom) return false;
  if (filter.dateTo && meta.publishDate > filter.dateTo) return false;
  return true;
}

/**
 * 本地向量存储（内存 + JSON 持久化）。
 *
 * 适用于开发与小规模演示。所有记录常驻内存，检索时全量扫描打分；
 * 知识库规模在数万条以内性能可接受。
 *
 * @example
 * ```typescript
 * const store = new LocalVectorStore(1024, { persistPath: './kb.json' });
 * await store.addDocuments(records);
 * const hits = await store.search(queryVec, 5, { filter: { levels: ['L2'] } });
 * ```
 */
export class LocalVectorStore implements VectorStore {
  /** 内存记录表（key: 分块 ID） */
  private records = new Map<string, VectorRecord>();

  /** 向量维度 */
  private readonly dimension: number;

  /** JSON 持久化路径（可空，空则不落盘） */
  private readonly persistPath?: string;

  /**
   * 创建本地向量存储
   *
   * @param dimension - 向量维度
   * @param options - 持久化选项
   */
  constructor(dimension: number, options?: { persistPath?: string }) {
    this.dimension = dimension;
    this.persistPath = options?.persistPath;
  }

  /**
   * 批量写入文档向量
   *
   * @param records - 向量记录列表
   */
  async addDocuments(records: readonly VectorRecord[]): Promise<void> {
    for (const rec of records) {
      this.records.set(rec.id, rec);
    }
    await this.persist();
  }

  /**
   * 相似度检索
   *
   * @param queryVector - 查询向量
   * @param topK - 返回结果数
   * @param options - 过滤条件与相似度阈值
   * @returns 命中结果（按相似度降序）
   */
  async search(
    queryVector: number[],
    topK: number,
    options?: {
      filter?: MetadataFilter;
      minScore?: number;
    },
  ): Promise<ScoredRecord[]> {
    const filter: MetadataFilter = options?.filter ?? {};
    const minScore = options?.minScore ?? 0;

    const scored: ScoredRecord[] = [];
    for (const rec of this.records.values()) {
      if (!matchesFilter(rec.metadata, filter)) continue;
      const score = cosineSimilarity(queryVector, rec.vector);
      if (score < minScore) continue;
      scored.push({ record: rec, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /**
   * 按分块 ID 删除向量
   *
   * @param ids - 分块 ID 列表
   */
  async delete(ids: readonly string[]): Promise<void> {
    for (const id of ids) {
      this.records.delete(id);
    }
    await this.persist();
  }

  /**
   * 更新指定分块的向量与内容
   *
   * @param id - 分块 ID
   * @param vector - 新向量
   * @param content - 新内容（可选）
   */
  async update(id: string, vector: number[], content?: string): Promise<void> {
    const existing = this.records.get(id);
    if (!existing) {
      throw new Error(`分块不存在，无法更新: ${id}`);
    }
    this.records.set(id, {
      ...existing,
      vector,
      content: content ?? existing.content,
    });
    await this.persist();
  }

  /**
   * 获取存储统计信息
   *
   * @returns 统计信息
   */
  async getStats(): Promise<VectorStoreStats> {
    const docs = new Set<string>();
    const byLevel: Record<string, number> = {};
    for (const rec of this.records.values()) {
      docs.add(rec.metadata.knowledgeId);
      const lv = rec.metadata.level;
      byLevel[lv] = (byLevel[lv] ?? 0) + 1;
    }
    return {
      totalRecords: this.records.size,
      dimension: this.dimension,
      distinctDocuments: docs.size,
      byLevel,
    };
  }

  /**
   * 列出全部记录
   *
   * @returns 全部向量记录
   */
  async listAll(): Promise<VectorRecord[]> {
    return Array.from(this.records.values());
  }

  /**
   * 清空存储
   */
  async clear(): Promise<void> {
    this.records.clear();
    await this.persist();
  }

  /**
   * 从 JSON 文件加载持久化数据（若配置了路径且文件存在）
   */
  async load(): Promise<void> {
    if (!this.persistPath) return;
    try {
      const raw = await fs.readFile(this.persistPath, 'utf-8');
      const arr = JSON.parse(raw) as VectorRecord[];
      this.records.clear();
      for (const rec of arr) {
        this.records.set(rec.id, rec);
      }
    } catch {
      // 文件不存在或解析失败：视为空库
    }
  }

  /**
   * 持久化到 JSON 文件（若配置了路径）
   */
  private async persist(): Promise<void> {
    if (!this.persistPath) return;
    try {
      await fs.writeFile(
        this.persistPath,
        JSON.stringify(Array.from(this.records.values())),
        'utf-8',
      );
    } catch {
      // 持久化失败不影响内存检索（开发环境容忍）
    }
  }
}
