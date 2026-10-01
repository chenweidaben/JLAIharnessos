/**
 * 健澜科技 jlmedaios - OpenAI 兼容嵌入（Embedding）提供者（真实 HTTP）
 *
 * 对接任何 OpenAI `/v1/embeddings` 兼容的文本向量化服务
 * （OpenAI text-embedding-3-small/large、自建 BGE/TEI 服务、各类兼容网关）：
 *   1. 单条或批量文本通过 JSON 提交；
 *   2. 取回等序的稠密向量，逐条 L2 归一化后返回。
 *
 * 安全：API Key 仅从配置注入、用于 Authorization 头，不打印、不落库；
 *   网络 / 鉴权失败明确抛错，绝不返回假向量；批量结果顺序严格对齐。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { EmbeddingService } from '../vector/EmbeddingService';

export interface OpenAIEmbeddingConfig {
  /** 服务根地址，例如 https://api.openai.com/v1 或自建 http://host:8080/v1 */
  baseURL: string;
  apiKey: string;
  /** 嵌入模型，例如 text-embedding-3-small / bge-large-zh-v1.5 */
  model: string;
  /** 调用超时（毫秒） */
  timeoutMs?: number;
}

interface EmbeddingResponse {
  data?: Array<{ embedding?: number[]; index?: number }>;
  model?: string;
}

export class OpenAIEmbeddingProvider implements EmbeddingService {
  readonly name = 'openai';
  private readonly cfg: OpenAIEmbeddingConfig;
  private _dimension = 0;

  constructor(config: OpenAIEmbeddingConfig) {
    this.cfg = { timeoutMs: 30_000, ...config };
  }

  /** 向量维度：首次调用后按真实返回确定，未调用前为 0。 */
  get dimension(): number {
    return this._dimension;
  }

  /** 调用 /embeddings，input 可为单条或批量，返回等序向量。 */
  private async call(input: string | string[]): Promise<number[][]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${this.cfg.baseURL.replace(/\/$/, '')}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: this.cfg.model, input }),
        signal: controller.signal,
      });
    } catch (err) {
      throw new Error(`调用嵌入服务失败：${(err as Error).message}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`嵌入服务返回 HTTP ${res.status}${detail ? `：${detail.slice(0, 200)}` : ''}`);
    }

    const data = (await res.json()) as EmbeddingResponse;
    const items = data.data ?? [];
    // 按 index 排序（多数服务已等序，显式排序更稳妥）
    items.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const vectors = items.map((it) => {
      if (!Array.isArray(it.embedding) || it.embedding.length === 0) {
        throw new Error('嵌入服务返回的向量为空或格式非法');
      }
      return it.embedding;
    });
    if (vectors.length === 0) throw new Error('嵌入服务未返回任何向量');
    if (this._dimension === 0) this._dimension = vectors[0].length;
    return vectors;
  }

  async embed(text: string): Promise<number[]> {
    const [vec] = await this.call(text);
    return normalizeL2(vec);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const vectors = await this.call(texts);
    if (vectors.length !== texts.length) {
      throw new Error(`嵌入批量结果数 ${vectors.length} 与输入数 ${texts.length} 不一致`);
    }
    return vectors.map(normalizeL2);
  }
}

/** L2 归一化（返回新数组）。 */
function normalizeL2(vec: number[]): number[] {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return [1, ...vec.slice(1).fill(0)];
  return vec.map((v) => v / norm);
}
