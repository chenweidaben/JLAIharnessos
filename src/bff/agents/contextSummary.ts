/**
 * MEDMUSE 多轮对话上下文摘要（纯函数，不调 LLM）。
 *
 * 背景：长会话直接把全部历史塞进 prompt 会导致上下文窗口爆炸、成本飙升且
 * 早期信息被稀释。本模块在「拼装 prompt 之前」做一次规则压缩：
 *   - shouldSummarize：历史消息条数严格大于阈值（默认 20）才触发；
 *   - summarizeMessages：用关键词规则把早期对话压成一段摘要文本，重点保留
 *     关键实体——诊断结论、医嘱/治疗决定、审批结论；
 *   - splitForSummary：把历史切成「早期（走摘要）+ 最近 N 条（保留原文）」。
 *
 * 医疗安全：摘要只是上下文压缩，不产生任何新的诊疗结论；保留的关键实体直接
 * 取自原始消息文本，不做临床推断，不修改医嘱/审批内容。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 摘要触发阈值：历史消息条数严格大于该值才摘要（19/20 不触发，21 触发） */
export const DEFAULT_SUMMARY_THRESHOLD = 20;

/** 触发摘要后，保留最近多少条原文不压缩 */
export const RECENT_RAW_COUNT = 10;

/** 一条可被摘要处理的最小消息形状（MedmuseMessageRow / ChatMessage 均兼容） */
export interface SummarizableMessage {
  role: string;
  content: string;
}

/**
 * 是否需要对历史做摘要。
 * 边界：length === 19 → false；length === 20 → false；length === 21 → true。
 */
export function shouldSummarize(
  messages: SummarizableMessage[],
  threshold: number = DEFAULT_SUMMARY_THRESHOLD,
): boolean {
  return Array.isArray(messages) && messages.length > threshold;
}

// ----------------------------------------------------------------------------
// 规则式关键实体抽取
// ----------------------------------------------------------------------------

/**
 * 关键实体关键词组。命中即视为需要在摘要中保留的「诊疗节点」：
 *   诊断结论 / 医嘱·治疗决定 / 审批结论。
 */
const KEY_PATTERNS: ReadonlyArray<{ tag: string; regex: RegExp }> = [
  { tag: '诊断', regex: /(诊断|疑似|考虑为?|鉴别诊断|确诊|排除.{0,8}(?:诊断|病)|临床判断|拟诊)/ },
  { tag: '医嘱·决定', regex: /(医嘱|开立|处方|用药|给药|治疗方案|治疗计划|决定|同意|确认执行|下达|停用)/ },
  { tag: '审批结论', regex: /(审批|批准|通过|驳回|拒绝|退回|工单|审批单|需?要审批|已批准|不予)/ },
];

/** 单条摘要要点的最大字符数（防止长文本再次撑爆上下文） */
const MAX_ITEM_LEN = 80;

/** 摘要最多保留多少个关键节点 */
const MAX_ITEMS = 12;

function normalize(text: string): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

function truncate(text: string, n: number = MAX_ITEM_LEN): string {
  const t = normalize(text);
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function detectTag(content: string): string | null {
  for (const p of KEY_PATTERNS) {
    if (p.regex.test(content)) return p.tag;
  }
  return null;
}

function roleLabel(role: string): string {
  if (role === 'user') return '用户';
  if (role === 'agent' || role === 'assistant') return 'AI';
  return '系统/工具';
}

/**
 * 把早期消息压缩成一段摘要文本（纯规则，不调 LLM）。
 *
 * 策略：
 *   1. 永远保留「首个用户消息」作为话题起点；
 *   2. 扫描每条消息，命中诊断/医嘱·决定/审批结论关键词的，提炼为一条要点；
 *   3. 要点去重、截断、编号；未命中任何关键实体时给出兜底说明。
 */
export function summarizeMessages(messages: SummarizableMessage[]): string {
  if (!Array.isArray(messages) || messages.length === 0) {
    return '';
  }

  const kept: string[] = [];
  const seen = new Set<string>();
  let foundKeyEntity = false;
  const push = (text: string): void => {
    if (!text) return;
    if (seen.has(text)) return;
    seen.add(text);
    kept.push(text);
  };

  // 1) 话题起点：首个用户消息
  const firstUser = messages.find((m) => m.role === 'user');
  if (firstUser && normalize(firstUser.content)) {
    push(`[话题] ${truncate(firstUser.content)}`);
  }

  // 2) 关键实体扫描
  for (const m of messages) {
    const content = normalize(m.content);
    if (!content) continue;
    const tag = detectTag(content);
    if (tag) {
      foundKeyEntity = true;
      push(`[${tag}·${roleLabel(m.role)}] ${truncate(content)}`);
    }
  }

  const items = kept.slice(0, MAX_ITEMS);
  const lines = items.length
    ? items.map((it, i) => `${i + 1}. ${it}`)
    : ['（无有效内容）'];
  if (!foundKeyEntity) {
    lines.push('（未识别到明确的诊断/医嘱/审批结论，其余为常规问答。）');
  }
  const body = lines.join('\n');

  return `【早期对话摘要·共 ${messages.length} 条消息】\n${body}\n（以上为早期对话要点，最近对话见下方原文。）`;
}

// ----------------------------------------------------------------------------
// 上下文切分
// ----------------------------------------------------------------------------

export interface SummarySplit {
  /** 走摘要压缩的早期消息 */
  early: SummarizableMessage[];
  /** 保留原文的最近消息 */
  recent: SummarizableMessage[];
  /** 早期摘要文本；未触发摘要时为空串 */
  summary: string;
}

/**
 * 按阈值把历史切成「早期摘要 + 最近原文」。
 * 未触发摘要时：early 为空、recent 为全部历史、summary 为空串（行为与压缩前一致）。
 */
export function splitForSummary(
  messages: SummarizableMessage[],
  threshold: number = DEFAULT_SUMMARY_THRESHOLD,
  recentCount: number = RECENT_RAW_COUNT,
): SummarySplit {
  if (!shouldSummarize(messages, threshold)) {
    return { early: [], recent: [...(messages ?? [])], summary: '' };
  }
  const recent = messages.slice(-recentCount);
  const early = messages.slice(0, messages.length - recent.length);
  return { early, recent, summary: summarizeMessages(early) };
}
