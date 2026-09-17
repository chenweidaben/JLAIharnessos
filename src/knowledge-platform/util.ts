/**
 * 健澜科技杠OS — 知识中台纯函数工具集
 *
 * - 确定性本地 Encoder：基于字符 n-gram + 词哈希的特征嵌入，离线可运行、可测试、维度稳定；
 *   生产环境可通过 Encoder 接口替换为 BGE / m3e / OpenAI 等真实 Embedding 模型，检索链路不变。
 * - BM25-lite 所需的中文友好分词（二元字组 + 拉丁词）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

/** 稳定字符串哈希（FNV-1a 32 位） */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    // FNV prime
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 中文友好分词：连续拉丁/数字串成词，CJK 取单字 + 相邻二元组（提升召回） */
export function tokenize(text: string): string[] {
  if (!text) return [];
  const normalized = text.toLowerCase().replace(/\s+/g, ' ');
  const tokens: string[] = [];
  const latin = normalized.match(/[a-z0-9][a-z0-9.\-]*/g);
  if (latin) tokens.push(...latin);
  const cjkChars: string[] = [];
  const cjk = normalized.match(/[一-鿿]/g);
  if (cjk) {
    for (const ch of cjk) {
      tokens.push(ch);
      cjkChars.push(ch);
    }
    for (let i = 0; i < cjkChars.length - 1; i++) {
      tokens.push(cjkChars[i] + cjkChars[i + 1]);
    }
  }
  return tokens;
}

export interface Encoder {
  readonly dimension: number;
  embed(text: string): number[];
  cosine(a: number[], b: number[]): number;
}

/** 特征哈希嵌入器：将 token 特征哈希到固定维度并 L2 归一化 */
export class HashingEncoder implements Encoder {
  readonly dimension: number;

  constructor(dimension = 512) {
    this.dimension = dimension;
  }

  embed(text: string): number[] {
    const vec = new Array<number>(this.dimension).fill(0);
    const tokens = tokenize(text);
    if (tokens.length === 0) return vec;
    for (const tok of tokens) {
      const h = fnv1a(tok);
      const idx = h % this.dimension;
      // 用哈希高位决定符号，减少碰撞叠加
      const sign = (h >>> 16) & 1 ? 1 : -1;
      // 词频的次线性加权 1+ln(tf) 由重复次数隐式累积
      vec[idx] += sign;
    }
    // 同时加入字符 trigram 提升局部语义
    const compact = text.replace(/\s+/g, '');
    for (let i = 0; i + 3 <= compact.length; i++) {
      const gram = compact.slice(i, i + 3);
      const h = fnv1a('g:' + gram);
      vec[h % this.dimension] += 0.5 * ((h >>> 16) & 1 ? 1 : -1);
    }
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < vec.length; i++) vec[i] /= norm;
    return vec;
  }

  cosine(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }
}

/** 估算 token 数（与 src/knowledge 保持一致的轻量启发式） */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjk = text.match(/[一-鿿　-〿＀-￯]/g);
  const words = text.match(/[A-Za-z0-9]+/g);
  let tokens = (cjk?.length ?? 0) + (words?.length ?? 0);
  const rest = text.length - (cjk?.length ?? 0) - (words ? words.join('').length : 0);
  tokens += Math.max(0, Math.round(rest * 0.5));
  return Math.max(1, tokens);
}

/** 生成短随机 id */
export function shortId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** 计算一组字符串的 sha256（Bun/Node 兼容，同步使用 Web Crypto 需要 async，这里用轻量 djb2 双哈希作为内容指纹） */
export function contentFingerprint(text: string): string {
  let h1 = 5381;
  let h2 = 52711;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = ((h1 << 5) + h1 + c) >>> 0;
    h2 = ((h2 << 7) + h2 + c * 31) >>> 0;
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}
