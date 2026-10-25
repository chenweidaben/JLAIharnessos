/**
 * 草稿稳定业务字段哈希（契约 §8）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 仅对稳定业务字段（kind/title/summary/content/evidence/needsPhysicianReview/
 * isOutOfHospitalPrescription）做规范化序列化后计算 SHA-256；剔除 id/status/
 * reviewerId/reviewedAt/reviewNote/createdAt/updatedAt/draftHash 等易变字段，
 * 保证同一业务草稿在审核流转前后哈希稳定，供哨兵去重使用。
 */

import { createHash } from 'node:crypto';

import type { ConsultDraft, EvidenceItem } from './types';

/** 参与哈希计算的稳定字段视图（与 ConsultDraft 结构对齐，剔除易变字段） */
export interface StableDraftFields {
  kind: ConsultDraft['kind'];
  title: string;
  summary: string;
  content: string;
  evidence: EvidenceItem[];
  needsPhysicianReview: true;
  isOutOfHospitalPrescription: false;
}

/** 去除全部空白差异（中英文排版空格 / 换行 / 缩进），保证同一业务文本哈希稳定 */
function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, '');
}

/** 证据条目稳定排序键：kind -> label -> source -> snippet */
function evidenceSortKey(item: EvidenceItem): string {
  return [item.kind, item.label, item.source, item.snippet].join('|');
}

/** 递归对对象键排序，数组保持排序后顺序，保证序列化结果与键书写顺序无关 */
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortDeep(entry));
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortDeep(source[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * 提取草稿稳定字段并规范化
 *
 * @param draft 草稿实体或稳定字段视图
 * @returns 规范化后的稳定字段对象（evidence 已按稳定键排序，文本已折叠空白）
 */
export function extractStableFields(draft: ConsultDraft | StableDraftFields): StableDraftFields {
  const evidence = [...draft.evidence].sort((a, b) =>
    evidenceSortKey(a).localeCompare(evidenceSortKey(b)),
  );
  return {
    kind: draft.kind,
    title: collapseWhitespace(draft.title),
    summary: collapseWhitespace(draft.summary),
    content: collapseWhitespace(draft.content),
    evidence: evidence.map((item) => ({
      kind: item.kind,
      label: collapseWhitespace(item.label),
      source: collapseWhitespace(item.source),
      snippet: collapseWhitespace(item.snippet),
    })),
    needsPhysicianReview: draft.needsPhysicianReview,
    isOutOfHospitalPrescription: draft.isOutOfHospitalPrescription,
  };
}

/**
 * 计算草稿稳定业务字段 SHA-256 十六进制哈希
 *
 * @param draft 草稿实体或稳定字段视图
 * @returns 64 位十六进制哈希串
 */
export function computeDraftHash(draft: ConsultDraft | StableDraftFields): string {
  const stable = extractStableFields(draft);
  const normalized = sortDeep(stable);
  const payload = JSON.stringify(normalized);
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}
