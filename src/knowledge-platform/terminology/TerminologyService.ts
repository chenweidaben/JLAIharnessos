/**
 * 健澜科技杠OS — 术语标准化服务
 *
 * - 同义词归一、ICD-10 ↔ SNOMED/LOINC/ATC 交叉映射（基于 TermEntry.codes / 关系表）；
 * - 面向 Agent 与编码工具：输入临床自由文本，返回标准名、编码与候选置信度。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { type StandardizationResult, type TermEntry } from '../types';
import { tokenize } from '../util';

/** 字符集合相似度（Dice 系数，基于二元字组） */
export function diceSimilarity(a: string, b: string): number {
  const bigrams = (s: string): Set<string> => {
    const norm = s.replace(/\s+/g, '');
    const set = new Set<string>();
    for (let i = 0; i < norm.length - 1; i++) set.add(norm.slice(i, i + 2));
    if (norm.length === 1) set.add(norm);
    return set;
  };
  const A = bigrams(a.toLowerCase());
  const B = bigrams(b.toLowerCase());
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((x) => {
    if (B.has(x)) inter++;
  });
  return (2 * inter) / (A.size + B.size);
}

export class TerminologyService {
  /** 名称/同义词 → entry 索引 */
  private nameIndex = new Map<string, TermEntry>();
  private entries: TermEntry[] = [];

  load(entries: TermEntry[]): void {
    this.entries = entries;
    this.nameIndex.clear();
    for (const e of entries) {
      this.nameIndex.set(e.name.toLowerCase(), e);
      for (const s of e.synonyms) this.nameIndex.set(s.toLowerCase(), e);
    }
  }

  get size(): number {
    return this.entries.length;
  }

  /** 标准化：精确 → 包含 → 相似度三级匹配 */
  standardize(raw: string, sourceFilter?: string, threshold = 0.45): StandardizationResult {
    const q = raw.trim().toLowerCase();
    const pool = sourceFilter ? this.entries.filter((e) => e.sourceId === sourceFilter) : this.entries;

    // 精确
    const exact = this.nameIndex.get(q);
    if (exact && (!sourceFilter || exact.sourceId === sourceFilter)) {
      return {
        raw,
        matched: true,
        canonicalName: exact.name,
        code: exact.code,
        sourceId: exact.sourceId,
        confidence: 1,
        candidates: [{ name: exact.name, code: exact.code, sourceId: exact.sourceId, score: 1 }],
      };
    }

    // 模糊
    const candidates: StandardizationResult['candidates'] = [];
    for (const e of pool) {
      const names = [e.name, ...e.synonyms];
      let best = 0;
      for (const n of names) {
        const nl = n.toLowerCase();
        if (nl === q) best = 1;
        else if (nl.includes(q) || q.includes(nl)) best = Math.max(best, 0.82);
        else best = Math.max(best, diceSimilarity(q, nl) * 0.9);
        // token 覆盖
        const qt = new Set(tokenize(q));
        const nt = new Set(tokenize(nl));
        if (qt.size) {
          let cov = 0;
          qt.forEach((t) => nt.has(t) && cov++);
          best = Math.max(best, (cov / qt.size) * 0.7);
        }
      }
      if (best >= threshold) candidates.push({ name: e.name, code: e.code, sourceId: e.sourceId, score: Number(best.toFixed(3)) });
    }
    candidates.sort((a, b) => b.score - a.score);
    const top = candidates[0];
    return {
      raw,
      matched: !!top,
      canonicalName: top?.name,
      code: top?.code,
      sourceId: top?.sourceId,
      confidence: top?.score ?? 0,
      candidates: candidates.slice(0, 8),
    };
  }

  /** 跨体系映射：先定位条目，再通过 fields.crossMap 或同名条目反查目标体系编码 */
  mapCode(code: string, fromSource: string, toSource: string): { code: string; name: string } | undefined {
    const src = this.entries.find((e) => e.code === code && e.sourceId === fromSource);
    if (!src) return undefined;
    const cross = (src.fields.crossMap as Record<string, string> | undefined)?.[toSource];
    if (cross) {
      const target = this.entries.find((e) => e.sourceId === toSource && e.code === cross);
      if (target) return { code: target.code, name: target.name };
      return { code: cross, name: src.name };
    }
    // 同名跨库回退
    const target = this.entries.find((e) => e.sourceId === toSource && (e.name === src.name || e.synonyms.includes(src.name)));
    return target ? { code: target.code, name: target.name } : undefined;
  }

  /** 展开某体系下的子节点（分类树） */
  children(sourceId: string, parentCode: string): TermEntry[] {
    return this.entries.filter((e) => e.sourceId === sourceId && e.parentCode === parentCode);
  }

  lookup(code: string, sourceId?: string): TermEntry | undefined {
    return this.entries.find((e) => e.code === code && (!sourceId || e.sourceId === sourceId));
  }
}
