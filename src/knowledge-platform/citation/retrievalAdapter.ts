/**
 * 健澜AI原生医院操作系统OS — knowledge-platform/citation/retrievalAdapter.ts
 *
 * 协议层检索结果纯适配器（差距矩阵 R-06；S-12 既有 hybrid 结果挂接，不回改 `hybrid.ts`）：
 * 把 `hybrid.search()` 既有 `RetrievalHit` 结构映射为协议层 `CitationHit`，前置标签过滤、
 * 相关度阈值剔除，再交 `evidenceGuard` 做级别推导与拒答判定；字段无损透传。
 *
 * 边界：纯类型 + 纯函数 + 进程无状态；不调用 Embedding / 向量供应商、不发起网络请求、
 * 不修改既有召回模块内部实现；阈值与标签条件由入参构造。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RetrievalHit } from '../types.js';
import type { CitationHit, CitationSecurityLevel } from './citationProtocol.js';
import { guardEvidenceAnswer, type EvidenceGuardResult } from './evidenceGuard.js';

// ============================================================================
// 适配器输入 / 输出
// ============================================================================

/** 适配器配置：阈值、前置标签、问题与缺失资料清单；条件由调用方入参构造 */
export interface RetrievalAdapterOptions {
  /** 相关度阈值（含边界）；低于该值的命中剔除；缺省 0 */
  minScore?: number;
  /** 前置过滤标签清单；命中 metadata.tags 与之相交才保留；缺省不约束 */
  requiredTags?: string[];
  /** 原始问题（供拒答模板回填） */
  question?: string;
  /** 资料不足待补充字段清单 */
  missingInfo?: string[];
  /** 判定时间（ISO8601，入参注入） */
  now?: string;
}

/** 适配器结果：守卫结论 + 映射命中与剔除计数台账 */
export interface RetrievalAdapterResult extends EvidenceGuardResult {
  /** 标签过滤与阈值剔除后保留的协议层命中 */
  mappedHits: CitationHit[];
  /** 原始命中总数 */
  rawCount: number;
  /** 最终保留命中数 */
  retainedCount: number;
  /** 被前置标签过滤剔除的命中数 */
  droppedByTag: number;
  /** 低于相关度阈值剔除的命中数 */
  droppedBelowThreshold: number;
}

const SECURITY_LEVELS: readonly CitationSecurityLevel[] = ['public', 'internal', 'confidential', 'restricted'];

function readString(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readSecurityLevel(metadata: Record<string, unknown> | undefined): CitationSecurityLevel | undefined {
  const raw = readString(metadata, 'securityLevel');
  return raw !== undefined && SECURITY_LEVELS.includes(raw as CitationSecurityLevel)
    ? (raw as CitationSecurityLevel)
    : undefined;
}

function hasRequiredTags(raw: RetrievalHit, requiredTags: readonly string[]): boolean {
  const tags = raw.metadata?.tags;
  if (!Array.isArray(tags)) return false;
  const own = tags.filter((tag): tag is string => typeof tag === 'string');
  return requiredTags.some((tag) => own.includes(tag));
}

/** 单条召回命中 → 协议层 CitationHit（字段一一对应，不做文本改写与重排打分） */
function mapHit(raw: RetrievalHit): CitationHit {
  return {
    chunkId: raw.id,
    title: raw.title,
    sectionPath: raw.sectionPath ?? '',
    provenance: raw.provenance,
    pageRef: readString(raw.metadata, 'pageRef'),
    effectiveDate: readString(raw.metadata, 'effectiveDate'),
    score: Number.isFinite(raw.score) ? raw.score : 0,
    graphPath: raw.graphPath,
    quotedExcerpt: raw.content,
    content: raw.content,
    securityLevel: readSecurityLevel(raw.metadata),
    conflictGroup: readString(raw.metadata, 'conflictGroup'),
  };
}

/**
 * 召回命中适配主入口（纯函数）。
 *
 * 处理顺序：标签前置过滤 → 相关度阈值剔除（含边界 `score >= minScore`）→ 协议层映射
 * → `guardEvidenceAnswer` 级别推导与拒答判定；剔除后命中为空时守卫输出无依据拒答结构。
 */
export function adaptRetrievalHits(rawHits: readonly RetrievalHit[], options: RetrievalAdapterOptions = {}): RetrievalAdapterResult {
  const requiredTags = Array.isArray(options.requiredTags) ? options.requiredTags : [];
  const minScore = typeof options.minScore === 'number' && Number.isFinite(options.minScore) ? options.minScore : 0;
  const raw = Array.isArray(rawHits) ? rawHits : [];

  let droppedByTag = 0;
  let droppedBelowThreshold = 0;
  const mapped: CitationHit[] = [];

  for (const rawHit of raw) {
    if (requiredTags.length > 0 && !hasRequiredTags(rawHit, requiredTags)) {
      droppedByTag += 1;
      continue;
    }
    if (rawHit.score < minScore) {
      droppedBelowThreshold += 1;
      continue;
    }
    mapped.push(mapHit(rawHit));
  }

  const guardResult = guardEvidenceAnswer({
    hits: mapped,
    question: options.question,
    missingInfo: options.missingInfo,
    now: options.now,
  });

  return {
    ...guardResult,
    mappedHits: mapped,
    rawCount: raw.length,
    retainedCount: mapped.length,
    droppedByTag,
    droppedBelowThreshold,
  };
}
