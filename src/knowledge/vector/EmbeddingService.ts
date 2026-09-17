/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 嵌入服务（Embedding Service）抽象。
 * 定义文本向量化接口，并提供开发测试用的确定性 Mock 实现。
 * 生产环境应替换为 BGE-large-zh-v1.5（医学微调）等真实模型服务。
 */

/**
 * 文本嵌入服务接口。
 *
 * 负责将文本转换为固定维度的稠密向量，供向量检索使用。
 * 生产实现可对接 OpenAI / 通义 / 本地 BGE 模型，开发环境使用 Mock 实现。
 */
export interface EmbeddingService {
  /** 向量维度 */
  readonly dimension: number;

  /**
   * 嵌入单条文本
   *
   * @param text - 待嵌入文本
   * @returns 归一化向量
   */
  embed(text: string): Promise<number[]>;

  /**
   * 批量嵌入文本
   *
   * @param texts - 文本列表
   * @returns 向量列表（顺序与输入一致）
   */
  embedBatch(texts: string[]): Promise<number[][]>;
}

/** 默认向量维度（与《数据模型与知识库设计》6.2/6.4 节一致，1024 维） */
export const DEFAULT_EMBEDDING_DIMENSION = 1024;

/**
 * 32 位字符串哈希（FNV-1a 变体），用于确定性伪随机向量。
 *
 * 不依赖任何原生模块，纯 JS 实现，保证同一文本在任何运行环境产生相同向量。
 *
 * @param str - 输入字符串
 * @returns 32 位无符号整数哈希
 */
function hashString(str: string): number {
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime
  }
  return h >>> 0;
}

/**
 * 将文本切分为词元序列。
 *
 * 中文按相邻字组成二元组（bigram），英文/数字按连续串切分。
 * 这种切分让共享医学术语的文本在向量空间中彼此靠近，
 * 从而在 Mock 环境下也能进行有意义的语义近似检索。
 *
 * @param text - 原始文本
 * @returns 词元列表（小写化）
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const lower = text.toLowerCase();

  // 连续的拉丁字母/数字作为一个词元
  const wordRegex = /[a-z0-9]+/g;
  let m: RegExpExecArray | null;
  while ((m = wordRegex.exec(lower)) !== null) {
    if (m[0].length > 0) tokens.push(m[0]);
  }

  // 中文字符两两组合成二元组
  const cjkChars = lower.match(/[\u4e00-\u9fff]/g);
  if (cjkChars) {
    if (cjkChars.length === 1) {
      tokens.push(cjkChars[0]);
    } else {
      for (let i = 0; i < cjkChars.length - 1; i++) {
        tokens.push(cjkChars[i] + cjkChars[i + 1]);
      }
    }
  }
  return tokens;
}

/**
 * 确定性伪随机嵌入服务（Mock 实现）。
 *
 * 采用哈希技巧（feature hashing）：将每个词元哈希到向量维度的某一维，
 * 并以确定性符号累加到该维。共享词元越多，余弦相似度越高，
 * 因此 Mock 环境下"文本相似"能真实反映在向量相似度上。
 *
 * 该实现：
 * - 纯 JS，无原生依赖，无外部 API 调用；
 * - 确定性：同一文本永远产生同一向量；
 * - 输出向量已 L2 归一化，便于直接用内积计算余弦相似度。
 *
 * 生产环境请替换为对接真实 Embedding 模型的实现。
 */
export class MockEmbeddingService implements EmbeddingService {
  /** 向量维度 */
  public readonly dimension: number;

  /**
   * 创建 Mock 嵌入服务
   *
   * @param dimension - 向量维度，默认 1024
   */
  constructor(dimension: number = DEFAULT_EMBEDDING_DIMENSION) {
    if (dimension <= 0) {
      throw new Error(`嵌入维度必须为正整数，收到 ${dimension}`);
    }
    this.dimension = dimension;
  }

  /**
   * 嵌入单条文本
   *
   * @param text - 待嵌入文本
   * @returns L2 归一化向量
   */
  async embed(text: string): Promise<number[]> {
    const vec = new Array<number>(this.dimension).fill(0);
    const tokens = tokenize(text);

    for (const token of tokens) {
      const h = hashString(token);
      // 用哈希值前半段决定维度位置，后半段决定符号
      const idx = h % this.dimension;
      const signSeed = hashString(token + '::sign');
      const sign = (signSeed & 1) === 0 ? 1 : -1;
      // 用第二组哈希调制幅值，避免过于稀疏
      const magSeed = hashString(token + '::mag');
      const magnitude = 0.5 + (magSeed % 1000) / 1000; // 0.5 ~ 1.5
      vec[idx] += sign * magnitude;
    }

    this.normalize(vec);
    return vec;
  }

  /**
   * 批量嵌入文本
   *
   * @param texts - 文本列表
   * @returns 归一化向量列表
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const t of texts) {
      results.push(await this.embed(t));
    }
    return results;
  }

  /**
   * L2 归一化向量（原地修改）
   *
   * @param vec - 待归一化向量
   */
  private normalize(vec: number[]): void {
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm);
    if (norm === 0) {
      // 空向量：给一个确定性的单位向量，避免除零
      vec[0] = 1;
      return;
    }
    for (let i = 0; i < vec.length; i++) {
      vec[i] = vec[i] / norm;
    }
  }
}
