/**
 * 健澜AI原生医院操作系统OS — knowledge-platform/citation/evidenceGuard.ts
 *
 * 无命中 / 无引用拒答离线守卫（差距矩阵 R-06 安全底线；S-12 协议层纯函数复用）：
 * 输入检索命中清单与既有证据级别，`none` 级别强制走 `buildNoEvidenceAnswer` 模板并附
 * 拒答标记；候选结论未附引用时阻断；产出可交 S-08 审计事件的结构化引用快照。
 *
 * 边界：纯类型 + 纯函数 + 进程无状态；不调用真实模型、不挂接真实事件总线、不发起网络请求；
 * 审计快照不携带原始患者正文，仅留命中计数、引用编号清单与级别判定结果。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EvidenceLevel } from '@/security/ai/types.js';
import {
  buildCitations,
  buildNoEvidenceAnswer,
  deriveEvidenceLevel,
  type Citation,
  type CitationHit,
  type CitedAnswer,
} from './citationProtocol.js';

// ============================================================================
// 守卫判定口径
// ============================================================================

/** 守卫阻断 / 放行原因码（供审计事件与前端弹窗留痕，不暴露内部台账结构） */
export type EvidenceGuardReason =
  | 'NONE_EVIDENCE'
  | 'NO_CITATION_FOR_CLAIM'
  | 'PARTIAL_EVIDENCE'
  | 'SUPPORTED';

/** 交 S-08 审计事件的结构化引用快照（不含患者正文与候选结论原文） */
export interface EvidenceAuditSnapshot {
  /** 证据级别（none / partial / supported） */
  level: EvidenceLevel;
  /** 进入守卫的命中数 */
  hitCount: number;
  /** 装配完成的引用条目数 */
  citationCount: number;
  /** 引用命中的知识块 ID 清单（去重后顺序） */
  chunkIds: string[];
  /** 判定原因码 */
  reasonCode: EvidenceGuardReason;
  /** 是否为无依据拒答形态（强制模板 + 拒答标记） */
  markedNoEvidence: boolean;
  /** 判定时间（ISO8601，入参注入；缺省由调用方审计链补充） */
  reviewedAt?: string;
}

/** 守卫输入：命中清单、候选答案（可选）、问题与缺失资料清单；时间戳入参注入 */
export interface EvidenceGuardInput {
  hits?: CitationHit[];
  /** 候选结构化答案；阻断时不采用其正文，仅用于判定是否附引用编号 */
  candidateAnswer?: CitedAnswer;
  /** 原始问题（仅用于拒答模板回填，不写入审计快照） */
  question?: string;
  /** 资料不足待补充字段清单 */
  missingInfo?: string[];
  /** 判定时间（ISO8601）；缺省快照留空，由审计链补记 */
  now?: string;
}

/** 守卫输出：放行 / 阻断结论、最终答案、引用条目、级别与审计快照 */
export interface EvidenceGuardResult {
  /** 是否允许候选结论进入后续装配；阻断时采用拒答模板答案 */
  allowed: boolean;
  /** 最终结构化答案（阻断时为无依据拒答模板） */
  answer: CitedAnswer;
  citations: Citation[];
  level: EvidenceLevel;
  reasonCode: EvidenceGuardReason;
  /** 是否为无依据拒答形态（强制模板 + 拒答标记） */
  markedNoEvidence: boolean;
  auditSnapshot: EvidenceAuditSnapshot;
}

/** 候选答案含非空正文但未附任何引用编号时，判定为无引用主张 */
function hasUncitedClaim(answer: CitedAnswer | undefined): boolean {
  if (!answer) return false;
  const content = typeof answer.content === 'string' ? answer.content.trim() : '';
  return content.length > 0 && (!Array.isArray(answer.citations) || answer.citations.length === 0);
}

/**
 * 证据守卫主入口（纯函数）。
 *
 * 判定顺序：
 *  1. 命中为空 → `NONE_EVIDENCE`：强制 `buildNoEvidenceAnswer` 模板，附拒答标记，阻断放行；
 *  2. 候选答案有正文但无引用编号 → `NO_CITATION_FOR_CLAIM`：阻断，采用拒答模板；
 *  3. 级别 `partial`（命中但存在待补充资料）→ `PARTIAL_EVIDENCE`：阻断放行，保留引用与候选答案，
 *     由调用方提示补充资料后再形成确定性结论；
 *  4. 级别 `supported` → `SUPPORTED`：放行，引用条目透传。
 *
 * 快照仅记录计数、chunkId 清单、级别与原因码；不回填候选答案正文、不携带患者叙述。
 */
export function guardEvidenceAnswer(input: EvidenceGuardInput): EvidenceGuardResult {
  const hits = Array.isArray(input.hits) ? input.hits : [];
  const missingInfo = Array.isArray(input.missingInfo) ? input.missingInfo : [];
  const question = typeof input.question === 'string' ? input.question : '';
  const citations = buildCitations(hits);
  const level = deriveEvidenceLevel(hits, missingInfo);

  let allowed: boolean;
  let answer: CitedAnswer;
  let reasonCode: EvidenceGuardReason;
  let markedNoEvidence = false;

  if (hits.length === 0) {
    allowed = false;
    answer = buildNoEvidenceAnswer(question, missingInfo);
    reasonCode = 'NONE_EVIDENCE';
    markedNoEvidence = true;
  } else if (hasUncitedClaim(input.candidateAnswer)) {
    allowed = false;
    answer = buildNoEvidenceAnswer(question, ['候选结论未附引用编号，已阻断确定性表述']);
    reasonCode = 'NO_CITATION_FOR_CLAIM';
    markedNoEvidence = true;
  } else if (level === 'partial') {
    allowed = false;
    answer = input.candidateAnswer
      ? structuredClone(input.candidateAnswer)
      : { content: '', citations, missingInfo: structuredClone(missingInfo), evidenceLevel: 'partial' };
    reasonCode = 'PARTIAL_EVIDENCE';
  } else {
    allowed = true;
    answer = input.candidateAnswer
      ? structuredClone(input.candidateAnswer)
      : { content: '', citations, missingInfo: [], evidenceLevel: 'supported' };
    reasonCode = 'SUPPORTED';
  }

  const auditSnapshot: EvidenceAuditSnapshot = {
    level,
    hitCount: hits.length,
    citationCount: citations.length,
    chunkIds: citations.map((citation) => citation.chunkId),
    reasonCode,
    markedNoEvidence,
    ...(typeof input.now === 'string' && input.now.trim().length > 0 ? { reviewedAt: input.now } : {}),
  };

  return { allowed, answer, citations, level, reasonCode, markedNoEvidence, auditSnapshot };
}
