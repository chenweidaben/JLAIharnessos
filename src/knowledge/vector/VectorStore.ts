/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 向量存储抽象接口。
 * 定义统一的向量存储契约，开发环境使用 LocalVectorStore（内存+JSON），
 * 生产环境可替换为 PostgreSQL + pgvector 或 Milvus/Qdrant 实现。
 */

import type { MetadataFilter, ScoredRecord, VectorRecord } from '../types';

/** 向量存储统计信息 */
export interface VectorStoreStats {
  /** 向量记录总数 */
  totalRecords: number;
  /** 向量维度 */
  dimension: number;
  /** 涉及的知识源数量 */
  distinctDocuments: number;
  /** 各知识层级记录数（key 为 L1-L5） */
  byLevel: Record<string, number>;
}

/**
 * 向量存储抽象接口。
 *
 * 屏蔽底层向量数据库差异，提供统一的增删改查与相似度检索能力。
 * 所有实现必须：
 * - 支持元数据过滤（科室、文档类型、知识层级、日期范围等）；
 * - 支持相似度阈值过滤；
 * - 返回带分数的命中结果并按相似度降序。
 */
export interface VectorStore {
  /**
   * 批量写入文档向量
   *
   * @param records - 向量记录列表
   */
  addDocuments(records: readonly VectorRecord[]): Promise<void>;

  /**
   * 相似度检索
   *
   * @param queryVector - 查询向量（应已归一化）
   * @param topK - 返回结果数
   * @param options - 可选过滤条件与相似度阈值
   * @returns 命中结果列表，按相似度降序
   */
  search(
    queryVector: number[],
    topK: number,
    options?: {
      filter?: MetadataFilter;
      minScore?: number;
    },
  ): Promise<ScoredRecord[]>;

  /**
   * 按分块 ID 删除向量
   *
   * @param ids - 分块 ID 列表
   */
  delete(ids: readonly string[]): Promise<void>;

  /**
   * 更新指定分块的向量与内容
   *
   * @param id - 分块 ID
   * @param vector - 新向量
   * @param content - 新内容（可选）
   */
  update(id: string, vector: number[], content?: string): Promise<void>;

  /**
   * 获取存储统计信息
   *
   * @returns 统计信息
   */
  getStats(): Promise<VectorStoreStats>;

  /**
   * 列出全部记录（供关键词检索/离线分析使用）
   *
   * @returns 全部向量记录
   */
  listAll(): Promise<VectorRecord[]>;

  /**
   * 清空存储（主要用于测试）
   */
  clear(): Promise<void>;
}
