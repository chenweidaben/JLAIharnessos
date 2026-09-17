/**
 * 健澜科技杠OS — 知识版本管理与质量评分
 *
 * - 数据集版本登记、增量更新（基于 checksum 去重）、回滚清单；
 * - 质量评分：编码唯一性、字段完整率、重复/缺失检测。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { type DatasetVersion, type QualityReport, type TermEntry } from '../types';
import { contentFingerprint } from '../util';

export class VersionManager {
  private versions = new Map<string, DatasetVersion[]>();

  record(v: DatasetVersion): void {
    const list = this.versions.get(v.sourceId) ?? [];
    list.unshift(v);
    this.versions.set(v.sourceId, list);
  }

  history(sourceId: string): DatasetVersion[] {
    return this.versions.get(sourceId) ?? [];
  }

  latest(sourceId: string): DatasetVersion | undefined {
    return this.versions.get(sourceId)?.[0];
  }

  all(): DatasetVersion[] {
    return [...this.versions.values()].flat();
  }
}

/** 计算一批术语条目质量分（0-100） */
export function scoreTerms(sourceId: string, entries: TermEntry[], requiredFields: string[] = ['name', 'code']): QualityReport {
  const issues: QualityReport['issues'] = [];
  const codeSeen = new Map<string, number>();
  let missingField = 0;

  for (const e of entries) {
    codeSeen.set(e.code, (codeSeen.get(e.code) ?? 0) + 1);
    for (const f of requiredFields) {
      const value = f === 'name' ? e.name : f === 'code' ? e.code : (e.fields[f] as unknown);
      if (value === undefined || value === null || value === '') {
        missingField++;
        break;
      }
    }
  }

  const duplicates = [...codeSeen.entries()].filter(([, n]) => n > 1);
  if (duplicates.length) {
    issues.push({
      type: 'duplicate_code',
      count: duplicates.reduce((s, [, n]) => s + n - 1, 0),
      sample: duplicates.slice(0, 5).map(([c]) => c).join(', '),
    });
  }
  if (missingField) issues.push({ type: 'missing_required_field', count: missingField });

  const totalFields = entries.length * requiredFields.length;
  const fieldCompleteness = totalFields ? 1 - missingField / entries.length : 1;
  const uniqueness = entries.length ? 1 - duplicates.length / entries.length : 1;
  const score = Math.round((uniqueness * 0.5 + fieldCompleteness * 0.5) * 100);

  return {
    scope: sourceId,
    total: entries.length,
    uniqueCodes: entries.length - duplicates.length,
    duplicateCodes: duplicates.length,
    fieldCompleteness: Number(fieldCompleteness.toFixed(3)),
    issues,
    score,
  };
}

/** 基于内容指纹去重，返回新增条目（增量更新） */
export function diffIncremental(existing: TermEntry[], incoming: TermEntry[]): { added: TermEntry[]; skipped: number } {
  const fingerprints = new Set(existing.map((e) => contentFingerprint(`${e.code}|${e.name}`)));
  const added: TermEntry[] = [];
  let skipped = 0;
  for (const e of incoming) {
    const fp = contentFingerprint(`${e.code}|${e.name}`);
    if (fingerprints.has(fp)) {
      skipped++;
      continue;
    }
    fingerprints.add(fp);
    added.push(e);
  }
  return { added, skipped };
}
