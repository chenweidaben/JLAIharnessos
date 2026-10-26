/**
 * 健澜AI原生医院操作系统OS — knowledge-platform/citation/citationProtocol.ts
 *
 * 引用编号协议与检索质量闭环（后端协议先行，技术文档 3.3.5 引用溯源协议、3.3.6 验收标准；
 * 差距矩阵 R-06 混合检索重排、R-07 引用溯源；台账 S-12「无命中拒答测试；引用弹窗闭环」）：
 * 命中 → Citation 编号装配、证据级别推导、引用一致性 / 完整性 / none 级别确定性约束校验、
 * 无依据拒答模板、前端弹窗数据纯映射。
 *
 * 本切片为纯类型 + 纯函数 + 进程无状态模块，离线闭环；不接 DB、不发起网络请求、不调用
 * 真实 LLM / Embedding；不改动既有 `src/knowledge-platform/types.ts`、`retrieval/hybrid.ts`、
 * S-11 生命周期模块与 S-01 输出防护规则集。前端 `[n]` 弹窗组件、hybrid 召回链路接线、
 * 独立重排模型接入归后续批次。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EvidenceLevel, OutboundLevel } from '@/security/ai/types.js';
import type { SourceProvenance } from '../types.js';

// ============================================================================
// 错误码与规则编号常量
// ============================================================================

/** 错误码前缀（供未来 BFF 路由错误映射统一挂接） */
export const CITATION_ERROR_PREFIX = 'CIT-';

/** 规则编号常量（与 `CitationRuleId` 联合类型一一对应） */
export const CITATION_RULE_REF_MISSING = 'ref-missing';
export const CITATION_RULE_REF_UNUSED = 'ref-unused';
export const CITATION_RULE_CITATION_INCOMPLETE = 'citation-incomplete';
export const CITATION_RULE_NONE_LEVEL_CERTAINTY = 'none-level-certainty';
export const CITATION_RULE_NONE_LEVEL_MISSING_MARKER = 'none-level-missing-marker';
export const CITATION_RULE_UNSUPPORTED_CLAIM = 'unsupported-claim';
export const CITATION_RULE_EVIDENCE_LEVEL_MISMATCH = 'evidence-level-mismatch';

// ============================================================================
// 类型契约（对齐 3.3.5 原文，字段只增不删，不回改既有 RetrievalHit 接口）
// ============================================================================

/** 引用条目密级（字面量口径对齐 S-11 `SecurityLevel`；本地联合类型，不反向依赖 lifecycle 模块） */
export type CitationSecurityLevel = 'public' | 'internal' | 'confidential' | 'restricted';

/** 协议层扩展命中（与既有 `RetrievalHit` 并存；3.3.5 RetrievalHit 扩展字段） */
export interface CitationHit {
  /** 知识块唯一标识 */
  chunkId: string;
  title: string;
  sectionPath: string;
  provenance: SourceProvenance;
  pageRef?: string;
  /** 生效日期 ISO8601 */
  effectiveDate?: string;
  /** 检索相关度得分（规则重排 / 模型重排后分值透传，本协议不计算得分） */
  score: number;
  /** 图谱关系路径 */
  graphPath?: string;
  /** 命中原文片段（缺省时由 `buildCitations` 从 `content` 截断装配） */
  quotedExcerpt?: string;
  /** 命中原文内容（截断兜底来源） */
  content?: string;
  securityLevel?: CitationSecurityLevel;
  /** 冲突分组（对齐 S-11 `conflictGroup`，供跨文档归并后续批次使用） */
  conflictGroup?: string;
}

/** 模型输出引用条目（3.3.5 Citation 八字段） */
export interface Citation {
  refId: string;
  chunkId: string;
  title: string;
  sectionPath: string;
  pageRef?: string;
  sourceName: string;
  effectiveDate?: string;
  quotedExcerpt: string;
}

/** 模型输出结构化载荷（纳入输出 Schema；3.3.5 content / citations / missingInfo / evidenceLevel） */
export interface CitedAnswer {
  /** 正文，引用位置标注 [n] 编号 */
  content: string;
  citations: Citation[];
  /** 资料不足留空字段清单（"待补充"） */
  missingInfo: string[];
  evidenceLevel: EvidenceLevel;
}

/** 协议层规则编号 */
export type CitationRuleId =
  | typeof CITATION_RULE_REF_MISSING
  | typeof CITATION_RULE_REF_UNUSED
  | typeof CITATION_RULE_CITATION_INCOMPLETE
  | typeof CITATION_RULE_NONE_LEVEL_CERTAINTY
  | typeof CITATION_RULE_NONE_LEVEL_MISSING_MARKER
  | typeof CITATION_RULE_UNSUPPORTED_CLAIM
  | typeof CITATION_RULE_EVIDENCE_LEVEL_MISMATCH;

/** 单条校验发现严重度（caution / block 两档，对齐 S-01 严重度口径子集） */
export type CitationIssueSeverity = 'caution' | 'block';

/** 单条引用校验发现 */
export interface CitationIssue {
  rule: CitationRuleId;
  severity: CitationIssueSeverity;
  message: string;
  excerpt?: string;
  refId?: string;
}

/** 校验结论（级别口径复用 S-01 `OutboundLevel`：PASS / CAUTION / BLOCK） */
export interface CitationVerdict {
  level: OutboundLevel;
  issues: CitationIssue[];
  /** 仅 PASS 时回填深拷贝答案；BLOCK 时不回填正文 */
  sanitizedAnswer?: CitedAnswer;
}

/** 前端弹窗数据契约（纯映射预留；组件归后续前端批次） */
export interface CitationPopupData {
  refId: string;
  chunkId: string;
  title: string;
  sectionPath: string;
  pageRef?: string;
  sourceName: string;
  effectiveDate?: string;
  securityLevel?: CitationSecurityLevel;
  quotedExcerpt: string;
}

// ============================================================================
// 常量与词表口径
// ============================================================================

/** 编号正则：合法 `[n]`（n ≥ 1 整数） */
const REF_MARKER_RE = /\[(\d+)\]/g;
/** 正文括号标记扫描（含非法格式，供 ref-missing 规则识别） */
const REF_TOKEN_RE = /\[[^\]]*\]/g;

/** 引用片段截断长度（超出前 120 字符 + 省略号） */
const EXCERPT_LIMIT = 120;
const EXCERPT_ELLIPSIS = '…';

/** none 级别确定性措辞词表（3.3.5：evidenceLevel=none 不得出现确定性结论） */
const CERTAINTY_PHRASES = [
  '确诊',
  '肯定',
  '必然',
  '一定',
  '无疑',
  '保证',
  '无需',
  '建议立即',
  '可以排除',
  '百分之百',
  '绝对',
];
const CERTAINTY_RE = new RegExp(CERTAINTY_PHRASES.join('|'));

/** none 级别必备标注 */
const PENDING_MARKER = '（待核实）';

/** 无依据拒答兜底缺口说明 */
export const NO_EVIDENCE_FALLBACK_MISSING = '检索未命中可引用知识条目';

/** 无依据拒答模板（离线确定性文案，不含确定性措辞，与 MEDICAL_DISCLAIMER 免责基调一致） */
export const NO_EVIDENCE_TEMPLATE =
  '（待核实）当前检索未获取到可引用的权威知识依据，以下问题暂无法给出确定性结论：{query}。请补充资料后由医务人员结合临床判断。';

// ============================================================================
// 纯函数辅助
// ============================================================================

function truncateExcerpt(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return '';
  return trimmed.length > EXCERPT_LIMIT ? `${trimmed.slice(0, EXCERPT_LIMIT)}${EXCERPT_ELLIPSIS}` : trimmed;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

// ============================================================================
// 编号提取与引用回查
// ============================================================================

/**
 * 提取正文全部合法 `[n]` 编号（按出现顺序去重保留首次）；供校验与前端锚点定位复用。
 * 非法格式标记（`[0]`、`[abc]` 等）不在本函数返回，由 `validateCitedAnswer` 按 ref-missing 拦截。
 */
export function extractRefMarkers(content: string): string[] {
  const seen = new Set<string>();
  const markers: string[] = [];
  REF_MARKER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = REF_MARKER_RE.exec(content)) !== null) {
    const refId = `[${match[1]}]`;
    if (!seen.has(refId)) {
      seen.add(refId);
      markers.push(refId);
    }
  }
  return markers;
}

/** 按 refId 精确回查引用条目；未命中返回 undefined */
export function findCitationByRef(answer: CitedAnswer, refId: string): Citation | undefined {
  return answer.citations.find((citation) => citation.refId === refId);
}

// ============================================================================
// 编号装配与证据级别推导
// ============================================================================

/**
 * 由命中清单装配 Citation 列表：按入参顺序生成 `[1]`…`[n]`；同 chunkId 去重保留首条；
 * sourceName 取 `provenance.sourceName`；quotedExcerpt 缺省时由命中内容截断（前 120 字符 + …）。
 * 本函数不补造缺失的 title / sectionPath / sourceName，缺失项由 `validateCitedAnswer` 拦截。
 */
export function buildCitations(hits: CitationHit[]): Citation[] {
  const seenChunkIds = new Set<string>();
  const citations: Citation[] = [];
  let sequence = 0;

  for (const hit of hits) {
    if (!isNonEmptyString(hit.chunkId) || seenChunkIds.has(hit.chunkId)) continue;
    seenChunkIds.add(hit.chunkId);
    sequence += 1;
    const sourceName = hit.provenance?.sourceName ?? '';
    const rawExcerpt = isNonEmptyString(hit.quotedExcerpt) ? hit.quotedExcerpt : hit.content ?? '';
    citations.push({
      refId: `[${sequence}]`,
      chunkId: hit.chunkId,
      title: hit.title ?? '',
      sectionPath: hit.sectionPath ?? '',
      pageRef: hit.pageRef,
      sourceName,
      effectiveDate: hit.effectiveDate,
      quotedExcerpt: truncateExcerpt(rawExcerpt),
    });
  }
  return citations;
}

/**
 * 证据级别推导：命中为空 → `none`；有命中且 `missingInfo` 非空 → `partial`；
 * 有命中且无缺口 → `supported`。
 */
export function deriveEvidenceLevel(hits: CitationHit[], missingInfo: string[]): EvidenceLevel {
  if (!hits || hits.length === 0) return 'none';
  if (Array.isArray(missingInfo) && missingInfo.length > 0) return 'partial';
  return 'supported';
}

// ============================================================================
// 校验器
// ============================================================================

/**
 * 引用一致性 / 完整性 / none 级别约束 / 级别错配 / 协议层粗检；逐条产出 `CitationIssue`。
 * 汇总级别：存在任一 block → BLOCK；否则存在任一 caution → CAUTION；否则 PASS。
 * PASS 时 `sanitizedAnswer` 回填深拷贝答案；BLOCK 时不回填正文。
 */
export function validateCitedAnswer(answer: CitedAnswer, hits?: CitationHit[]): CitationVerdict {
  const issues: CitationIssue[] = [];
  const citations = answer.citations ?? [];
  const markerSet = new Set(extractRefMarkers(answer.content));
  const citationRefIds = new Set(citations.map((citation) => citation.refId));

  // 规则 1：ref-missing（block）——正文出现 [n] 但 citations 无对应定义；编号格式非法一并归入
  REF_TOKEN_RE.lastIndex = 0;
  let token: RegExpExecArray | null;
  while ((token = REF_TOKEN_RE.exec(answer.content)) !== null) {
    const text = token[0];
    const numeric = /^\[(\d+)\]$/.exec(text);
    if (!numeric || Number(numeric[1]) < 1) {
      issues.push({
        rule: CITATION_RULE_REF_MISSING,
        severity: 'block',
        message: `${CITATION_ERROR_PREFIX}001 引用编号格式非法：${text}，编号必须为 [1]、[2] 形式的正整数。`,
        excerpt: text,
      });
      continue;
    }
    const refId = `[${numeric[1]}]`;
    if (!citationRefIds.has(refId)) {
      issues.push({
        rule: CITATION_RULE_REF_MISSING,
        severity: 'block',
        message: `${CITATION_ERROR_PREFIX}002 正文引用了未定义的编号 ${refId}，citations 中无对应条目。`,
        excerpt: text,
        refId,
      });
    }
  }

  // 规则 2：ref-unused（caution）——citations 存在但正文未引用
  for (const citation of citations) {
    if (!markerSet.has(citation.refId)) {
      issues.push({
        rule: CITATION_RULE_REF_UNUSED,
        severity: 'caution',
        message: `${CITATION_ERROR_PREFIX}003 引用条目 ${citation.refId} 未在正文中被标注，属于未使用引用。`,
        refId: citation.refId,
      });
    }
  }

  // 规则 3：citation-incomplete（block）——必填字段缺失；effectiveDate 格式非法
  for (const citation of citations) {
    const missing: string[] = [];
    if (!isNonEmptyString(citation.chunkId)) missing.push('chunkId');
    if (!isNonEmptyString(citation.title)) missing.push('title');
    if (!isNonEmptyString(citation.sectionPath)) missing.push('sectionPath');
    if (!isNonEmptyString(citation.sourceName)) missing.push('sourceName');
    if (!isNonEmptyString(citation.quotedExcerpt)) missing.push('quotedExcerpt');
    if (missing.length > 0) {
      issues.push({
        rule: CITATION_RULE_CITATION_INCOMPLETE,
        severity: 'block',
        message: `${CITATION_ERROR_PREFIX}004 引用条目 ${citation.refId} 元数据不完整，缺失字段：${missing.join('、')}。`,
        excerpt: citation.title || citation.sectionPath || undefined,
        refId: citation.refId,
      });
    }
    if (isNonEmptyString(citation.effectiveDate) && Number.isNaN(Date.parse(citation.effectiveDate))) {
      issues.push({
        rule: CITATION_RULE_CITATION_INCOMPLETE,
        severity: 'block',
        message: `${CITATION_ERROR_PREFIX}005 引用条目 ${citation.refId} 的 effectiveDate 格式非法：${citation.effectiveDate}。`,
        refId: citation.refId,
      });
    }
  }

  // 规则 4：none-level-missing-marker（block）——none 级别正文缺少「（待核实）」标注
  if (answer.evidenceLevel === 'none' && !answer.content.includes(PENDING_MARKER)) {
    issues.push({
      rule: CITATION_RULE_NONE_LEVEL_MISSING_MARKER,
      severity: 'block',
      message: `${CITATION_ERROR_PREFIX}006 证据级别为 none 时，正文必须标注「${PENDING_MARKER}」。`,
    });
  }

  // 规则 5：none-level-certainty（block）——none 级别命中确定性措辞
  if (answer.evidenceLevel === 'none') {
    const certainty = CERTAINTY_RE.exec(answer.content);
    if (certainty) {
      issues.push({
        rule: CITATION_RULE_NONE_LEVEL_CERTAINTY,
        severity: 'block',
        message: `${CITATION_ERROR_PREFIX}007 none 级别正文不得出现确定性措辞「${certainty[0]}」。`,
        excerpt: certainty[0],
      });
    }
  }

  // 规则 6：evidence-level-mismatch（caution）——级别与引用 / 缺口清单错配
  if (answer.evidenceLevel === 'supported' && citations.length === 0) {
    issues.push({
      rule: CITATION_RULE_EVIDENCE_LEVEL_MISMATCH,
      severity: 'caution',
      message: `${CITATION_ERROR_PREFIX}008 证据级别为 supported 但 citations 为空，级别与引用清单不一致。`,
    });
  }
  if (answer.evidenceLevel === 'none' && citations.length > 0) {
    issues.push({
      rule: CITATION_RULE_EVIDENCE_LEVEL_MISMATCH,
      severity: 'caution',
      message: `${CITATION_ERROR_PREFIX}009 证据级别为 none 但携带非空 citations，级别与引用清单不一致。`,
    });
  }
  if (answer.evidenceLevel === 'partial' && (!Array.isArray(answer.missingInfo) || answer.missingInfo.length === 0)) {
    issues.push({
      rule: CITATION_RULE_EVIDENCE_LEVEL_MISMATCH,
      severity: 'caution',
      message: `${CITATION_ERROR_PREFIX}010 证据级别为 partial 但 missingInfo 为空，级别与缺口清单不一致。`,
    });
  }

  // 规则 7：unsupported-claim（caution，协议层粗检）——supported / partial 正文不含任何 [n] 编号
  // 句级事实比对归 S-01 后续细粒度规则消费，本切片不做事实一致性判定。
  if ((answer.evidenceLevel === 'supported' || answer.evidenceLevel === 'partial') && markerSet.size === 0) {
    issues.push({
      rule: CITATION_RULE_UNSUPPORTED_CLAIM,
      severity: 'caution',
      message: `${CITATION_ERROR_PREFIX}011 正文未标注任何引用编号即给出结论，存在无依据陈述风险，供 S-01 句级规则复核。`,
    });
  }

  const hasBlock = issues.some((issue) => issue.severity === 'block');
  const hasCaution = issues.some((issue) => issue.severity === 'caution');
  const level: OutboundLevel = hasBlock ? 'BLOCK' : hasCaution ? 'CAUTION' : 'PASS';

  return {
    level,
    issues,
    sanitizedAnswer: level === 'PASS' ? deepClone(answer) : undefined,
  };
}

/** 模块级别名，供未来 BFF 路由直接挂接 */
export const validateCitations = validateCitedAnswer;

// ============================================================================
// 无依据拒答模板与弹窗映射
// ============================================================================

/**
 * 无命中拒答：evidenceLevel='none'、citations=[]、missingInfo 原样回读（空数组兜底缺口文案）；
 * 正文为离线确定性模板，含「（待核实）」且不含确定性措辞；query 原文进入模板。
 */
export function buildNoEvidenceAnswer(query: string, missingInfo: string[]): CitedAnswer {
  const fallback = Array.isArray(missingInfo) && missingInfo.length > 0 ? missingInfo : [NO_EVIDENCE_FALLBACK_MISSING];
  const content = NO_EVIDENCE_TEMPLATE.replace('{query}', query.trim());
  return {
    content,
    citations: [],
    missingInfo: deepClone(fallback),
    evidenceLevel: 'none',
  };
}

/** 引用条目 → 前端弹窗数据纯映射；字段一一对应，密级可选透传；不做文案加工 */
export function toCitationPopupData(
  citation: Citation,
  securityLevel?: CitationSecurityLevel,
): CitationPopupData {
  return {
    refId: citation.refId,
    chunkId: citation.chunkId,
    title: citation.title,
    sectionPath: citation.sectionPath,
    pageRef: citation.pageRef,
    sourceName: citation.sourceName,
    effectiveDate: citation.effectiveDate,
    securityLevel,
    quotedExcerpt: citation.quotedExcerpt,
  };
}
