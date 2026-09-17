/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 文本块（Chunk）模型。
 * 表示文档经切分后的最小检索单元，携带内容、来源、位置与结构化元数据。
 */

import type { ChunkMetadata, DocumentPosition } from '../types';

/**
 * 文本块模型。
 *
 * 每一个 Chunk 是向量检索的最小单元。入库时会连同其向量、元数据一起写入向量库，
 * 检索命中后作为 LLM 上下文片段返回，并支持追溯到源文档与章节。
 */
export interface Chunk {
  /** 分块唯一 ID（形如 {knowledgeId}#chunk-{index}） */
  id: string;
  /** 分块纯文本内容（已拼接章节路径前缀） */
  content: string;
  /** 所属知识源 ID */
  knowledgeId: string;
  /** 所属文档标题 */
  docTitle: string;
  /** 结构化分块元数据 */
  metadata: ChunkMetadata;
  /** 相对源文档的字符位置 */
  position: DocumentPosition;
  /** 估算 token 数 */
  tokenCount: number;
}

/**
 * 构建分块 ID。
 *
 * @param knowledgeId - 知识源 ID
 * @param chunkIndex - 分块序号
 * @returns 分块 ID
 */
export function buildChunkId(knowledgeId: string, chunkIndex: number): string {
  return `${knowledgeId}#chunk-${chunkIndex}`;
}
