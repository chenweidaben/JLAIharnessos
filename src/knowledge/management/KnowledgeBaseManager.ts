/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 知识库管理器（Knowledge Base Manager）。
 * 负责任知库 CRUD、知识入库流水线（文档上传 → 解析 → 切分 → 嵌入 → 存储 → 索引）、
 * 五级分层维护与知识版本管理，并对外提供检索引擎。
 */

import { DocumentParser } from '../processing/DocumentParser';
import { TextSplitter } from '../processing/TextSplitter';
import { RetrievalEngine } from '../retrieval/RetrievalEngine';
import type { KnowledgeLevel, VectorMetadata, VectorRecord } from '../types';
import type { EmbeddingService } from '../vector/EmbeddingService';
import type { VectorStore } from '../vector/VectorStore';
import type { KnowledgeSource } from './KnowledgeSource';

/** 入库结果统计 */
export interface IngestResult {
  /** 知识源 ID */
  knowledgeId: string;
  /** 生成的分块数 */
  chunkCount: number;
  /** 入库耗时（毫秒） */
  durationMs: number;
}

/** 知识库统计 */
export interface KnowledgeBaseStats {
  /** 知识源总数 */
  sourceCount: number;
  /** 向量块总数 */
  chunkCount: number;
  /** 各层级知识源数量 */
  byLevel: Record<KnowledgeLevel, number>;
}

/**
 * 知识库管理器。
 *
 * 串联解析、切分、嵌入与存储，维护知识源元数据与版本，
 * 并装配可直接使用的 RetrievalEngine。
 *
 * @example
 * ```typescript
 * const manager = new KnowledgeBaseManager(embeddingService, vectorStore);
 * await manager.ingest(guidelineSource);
 * const engine = manager.getRetrievalEngine();
 * const resp = await engine.retrieve('高血压诊断标准');
 * ```
 */
export class KnowledgeBaseManager {
  private readonly embeddingService: EmbeddingService;
  private readonly vectorStore: VectorStore;
  private readonly parser: DocumentParser;
  private readonly splitter: TextSplitter;

  /** 知识源仓库（key: knowledgeId） */
  private readonly sources = new Map<string, KnowledgeSource>();
  /** 知识源 ID → 分块 ID 列表（用于删除/更新） */
  private readonly sourceChunks = new Map<string, string[]>();

  /**
   * 创建知识库管理器
   *
   * @param embeddingService - 嵌入服务
   * @param vectorStore - 向量存储
   * @param options - 可选解析器/切分器配置
   */
  constructor(
    embeddingService: EmbeddingService,
    vectorStore: VectorStore,
    options?: { splitterConfig?: ConstructorParameters<typeof TextSplitter>[0] },
  ) {
    this.embeddingService = embeddingService;
    this.vectorStore = vectorStore;
    this.parser = new DocumentParser();
    this.splitter = new TextSplitter(options?.splitterConfig);
  }

  /**
   * 知识入库主流程：解析 → 切分 → 嵌入 → 存储 → 索引。
   *
   * @param source - 知识来源模型
   * @returns 入库结果统计
   */
  async ingest(source: KnowledgeSource): Promise<IngestResult> {
    const started = Date.now();

    // 若已存在同 ID 知识源，先删除旧块（版本更新）
    if (this.sourceChunks.has(source.knowledgeId)) {
      await this.remove(source.knowledgeId);
    }

    // 1. 文档解析
    const parsed = this.parser.parse(source.content, source.format ?? 'markdown');

    // 2. 文本切分
    const chunks = this.splitter.split(parsed, source.knowledgeId, source.title);

    // 3. 批量嵌入（内容 + 章节路径）
    const vectors = await this.embeddingService.embedBatch(chunks.map((c) => c.content));

    // 4. 组装向量记录并写入
    const records: VectorRecord[] = chunks.map((chunk, i) => {
      const meta: VectorMetadata = {
        knowledgeId: source.knowledgeId,
        chunkId: chunk.id,
        docTitle: source.title,
        sectionPath: chunk.metadata.sectionPath,
        level: source.level,
        category: source.category,
        sourceType: source.sourceType,
        department: source.department,
        publishDate: source.publishDate,
        version: source.version.currentVersion,
        authorityScore: source.authorityScore,
        evidenceLevel: source.evidenceLevel ?? chunk.metadata.evidenceLevel,
        tags: source.tags,
        isActive: source.isActive,
      };
      return {
        id: chunk.id,
        content: chunk.content,
        vector: vectors[i],
        metadata: meta,
      };
    });
    await this.vectorStore.addDocuments(records);

    // 5. 登记知识源与分块映射
    this.sources.set(source.knowledgeId, source);
    this.sourceChunks.set(
      source.knowledgeId,
      records.map((r) => r.id),
    );

    return {
      knowledgeId: source.knowledgeId,
      chunkCount: records.length,
      durationMs: Date.now() - started,
    };
  }

  /**
   * 删除知识源及其全部向量块。
   *
   * @param knowledgeId - 知识源 ID
   */
  async remove(knowledgeId: string): Promise<void> {
    const chunkIds = this.sourceChunks.get(knowledgeId);
    if (chunkIds && chunkIds.length > 0) {
      await this.vectorStore.delete(chunkIds);
    }
    this.sourceChunks.delete(knowledgeId);
    this.sources.delete(knowledgeId);
  }

  /**
   * 获取知识源
   *
   * @param knowledgeId - 知识源 ID
   * @returns 知识源，不存在返回 undefined
   */
  getSource(knowledgeId: string): KnowledgeSource | undefined {
    return this.sources.get(knowledgeId);
  }

  /**
   * 列出全部知识源
   *
   * @returns 知识源列表
   */
  listSources(): KnowledgeSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * 知识版本更新（新版本入库，旧版本归档）。
   *
   * @param source - 新版本知识源（knowledgeId 相同，version.currentVersion 递增）
   * @returns 入库结果
   */
  async publishNewVersion(source: KnowledgeSource): Promise<IngestResult> {
    const prev = this.sources.get(source.knowledgeId);
    if (prev) {
      source.version.previousVersion = prev.version.currentVersion;
      source.version.history = [
        ...prev.version.history,
        {
          version: prev.version.currentVersion,
          date: prev.publishDate,
          summary: '历史版本（已由新版本替代）',
        },
      ];
    }
    return this.ingest(source);
  }

  /**
   * 根据 knowledgeId 解析发布机构（供检索引擎证据追溯）。
   *
   * @param knowledgeId - 知识源 ID
   * @returns 发布机构
   */
  resolvePublisher(knowledgeId: string): string {
    const src = this.sources.get(knowledgeId);
    return src?.publisher ?? `未知来源(${knowledgeId})`;
  }

  /**
   * 装配并返回检索引擎。
   *
   * @returns 检索引擎
   */
  getRetrievalEngine(): RetrievalEngine {
    return new RetrievalEngine({
      embeddingService: this.embeddingService,
      vectorStore: this.vectorStore,
      publisherResolver: (kid) => this.resolvePublisher(kid),
    });
  }

  /**
   * 知识库统计。
   *
   * @returns 统计信息
   */
  async stats(): Promise<KnowledgeBaseStats> {
    const vectorStats = await this.vectorStore.getStats();
    const byLevel: Record<KnowledgeLevel, number> = {
      L1: 0,
      L2: 0,
      L3: 0,
      L4: 0,
      L5: 0,
    };
    for (const src of this.sources.values()) {
      byLevel[src.level] += 1;
    }
    return {
      sourceCount: this.sources.size,
      chunkCount: vectorStats.totalRecords,
      byLevel,
    };
  }
}
